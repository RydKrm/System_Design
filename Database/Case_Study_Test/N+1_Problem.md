# Testing the N+1 Query Disaster: A Field Guide for the New Engineer

## Why We Are Doing This Exercise

Before you touch a single line of production code, you must understand what an N+1 query problem _feels_ like from the inside, not just what it looks like on a whiteboard. Reading a definition and watching your own database buckle under a thousand tiny queries are two very different kinds of knowledge, and only the second kind sticks with you for the rest of your career. So in this guide we are going to build a small, disposable playground on your own laptop, deliberately write the bad code, watch it suffer, fix it, and watch it recover. Think of this the way a pilot thinks of a flight simulator: nobody wants you discovering what a stall feels like for the first time at ten thousand feet over a live customer.

The general shape of the problem is this. Your application first asks the database for a list of parent records, say five hundred orders. That is one honest query. But then, for each of those five hundred orders, your code turns around and asks the database a second question, "give me the items that belong to this one order," and it does this inside a loop. The database does not see this as five hundred orders worth of work; it sees five hundred and one separate conversations, each with its own overhead of parsing, planning, network round trip, and connection handling. At ten rows this is invisible. At ten thousand rows this is how a page that used to load in eighty milliseconds starts taking eight seconds, and your connection pool starts gasping for air while the CPU graph on your database dashboard turns into a cliff face.

Here is the shape of the traffic in picture form, so you can see why the database experiences this so differently than your application code does:

```
GOOD: one parent query, one batched child query
┌──────────┐        1 query (orders)         ┌──────────┐
│   App    │ ───────────────────────────────▶│ Database │
│          │◀─────────────────────────────── │          │
│          │   500 orders come back          └──────────┘
│          │
│          │   1 query (items WHERE order_id IN (...))
│          │ ───────────────────────────────▶┌──────────┐
│          │◀─────────────────────────────── │ Database │
└──────────┘   all items for all orders      └──────────┘

BAD: one parent query, then N child queries in a loop
┌──────────┐        1 query (orders)         ┌──────────┐
│   App    │ ───────────────────────────────▶│ Database │
│          │◀─────────────────────────────── │          │
└────┬─────┘   500 orders come back          └──────────┘
     │
     │  for each of the 500 orders:
     │     SELECT * FROM items WHERE order_id = ?
     ▼
┌─────────────────────────────────────────────────────────┐
│ query 1 → db   query 2 → db   query 3 → db  ... × 500   │
│ each one pays full round-trip cost, connection checkout,│
│ parsing, and planning, over and over and over again     │
└─────────────────────────────────────────────────────────┘
```

Once you have seen that picture, the rest of this exercise is just proving it with your own hands on your own machine.

## Setting Up the Local Playground

You already know Docker and PostgreSQL, so we will keep the environment honest and close to production rather than using some lightweight in-memory stand-in that would hide the very behaviour we are trying to observe. Start by spinning up a disposable Postgres container with query logging turned on, because the entire point of this exercise is to watch exactly how many queries get fired and how long each one takes.

```bash
docker run -d \
  --name n1-lab-postgres \
  -e POSTGRES_USER=labuser \
  -e POSTGRES_PASSWORD=labpass \
  -e POSTGRES_DB=n1lab \
  -p 5432:5432 \
  postgres:16 \
  -c log_statement=all \
  -c log_min_duration_statement=0
```

The two `-c` flags at the end are doing quiet but important work. `log_statement=all` tells Postgres to write every single SQL statement it receives into its log file, and `log_min_duration_statement=0` tells it to also record how long each one took, down to the millisecond. With both switched on, the container's logs become a live transcript of exactly what your application is asking the database to do, which is precisely the evidence you need to catch an N+1 pattern red-handed. You can watch that transcript scroll by in real time with a second terminal:

```bash
docker logs -f n1-lab-postgres
```

Next, connect to the freshly created database and lay down the two tables that will play the role of parent and child in our story, orders and the items that belong to them.

```bash
docker exec -it n1-lab-postgres psql -U labuser -d n1lab
```

```sql
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    customer    TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    product     TEXT NOT NULL,
    quantity    INTEGER NOT NULL
);

CREATE INDEX idx_items_order_id ON items(order_id);
```

Notice that we created an index on `items.order_id` right away. This is deliberate and a little mischievous: even with that index in place, the N+1 pattern will still be slow, because the problem was never about missing indexes, it was about the sheer number of round trips. Keeping this detail in mind will save you from a very common misdiagnosis later in your career, where someone says "just add an index" to a problem that indexing cannot touch.

## Filling the Database With Random Data

A handful of rows will never expose this problem, because at that scale the overhead of extra round trips is lost in the noise. You need enough data that the pattern becomes undeniable, so we will generate it directly inside Postgres using `generate_series`, which is a wonderfully efficient way to manufacture large volumes of fake rows without writing a single line of application code.

```sql
INSERT INTO orders (customer, created_at)
SELECT
    'customer_' || (floor(random() * 5000) + 1)::int,
    now() - (random() * interval '365 days')
FROM generate_series(1, 10000);

INSERT INTO items (order_id, product, quantity)
SELECT
    (floor(random() * 10000) + 1)::int,
    'product_' || (floor(random() * 200) + 1)::int,
    (floor(random() * 5) + 1)::int
FROM generate_series(1, 50000);
```

This leaves you with ten thousand orders and fifty thousand items scattered across them, roughly five items per order on average, which is a perfectly realistic shape for something like an e-commerce order history. You can confirm the counts and get a feel for the distribution with a couple of sanity checks before moving on.

```sql
SELECT count(*) FROM orders;
SELECT count(*) FROM items;
SELECT order_id, count(*) FROM items GROUP BY order_id ORDER BY count(*) DESC LIMIT 5;
```

## Writing the Guilty Code

Now we write the application code that commits the crime, using the Go stack you already work in every day. We will use `database/sql` directly so that nothing is hidden behind an ORM's magic, because the whole point is for you to see the loop with your own eyes.

```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

type Order struct {
	ID       int
	Customer string
}

type Item struct {
	ID       int
	OrderID  int
	Product  string
	Quantity int
}

func fetchOrdersNPlusOne(db *sql.DB) {
	start := time.Now()

	rows, err := db.Query(`SELECT id, customer FROM orders LIMIT 500`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.Customer); err != nil {
			log.Fatal(err)
		}
		orders = append(orders, o)
	}

	totalItems := 0
	for _, o := range orders {
		itemRows, err := db.Query(`SELECT id, order_id, product, quantity FROM items WHERE order_id = $1`, o.ID)
		if err != nil {
			log.Fatal(err)
		}
		for itemRows.Next() {
			var it Item
			itemRows.Scan(&it.ID, &it.OrderID, &it.Product, &it.Quantity)
			totalItems++
		}
		itemRows.Close()
	}

	fmt.Printf("N+1 version: %d orders, %d items, took %s\n", len(orders), totalItems, time.Since(start))
}
```

Reading this function closely, you will notice that it looks entirely innocent. There is nothing syntactically wrong with it, no error being swallowed, no typo. This is exactly why N+1 bugs survive code review so often: the code reads as correct because it _is_ correct, it simply happens to be correct in the slowest possible way. The loop body makes a perfectly reasonable-looking database call, and only when you step back and count how many times that call executes does the shape of the disaster become visible.

## Watching It Fail

Connect this Go program to your lab database using a standard connection string pointed at the container, run `fetchOrdersNPlusOne`, and then go look at the two places that will tell you the truth about what just happened. The first place is your own terminal, where the `time.Since(start)` print statement will report a duration that is dramatically worse than a single query of this size has any right to take. The second, and more convincing, place is the `docker logs -f n1-lab-postgres` terminal you opened earlier, which will scroll past with five hundred and one nearly identical `SELECT ... FROM items WHERE order_id = $1` statements stacking up one after another. Seeing that log scroll endlessly is usually the moment this problem stops being an abstract interview question and becomes something an engineer never forgets.

For a more clinical measurement than eyeballing a terminal, Postgres offers `EXPLAIN ANALYZE`, which will tell you exactly how the planner executed a single one of those item queries and how long it took in isolation.

```sql
EXPLAIN ANALYZE SELECT id, order_id, product, quantity FROM items WHERE order_id = 42;
```

Run that once and you will likely see a fast index scan taking well under a millisecond. That is the trap: each individual query is fast, which is exactly why this bug hides from casual testing on small datasets and only reveals itself once you multiply that small cost by thousands of repetitions and add in the fixed overhead of opening a connection, parsing SQL, and crossing the network boundary for every single one of those repetitions.

If you want a single aggregate number instead of scrolling logs, enable the `pg_stat_statements` extension, which keeps a running tally of every distinct query shape Postgres has executed along with how many times it ran and the total time spent on it.

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 5;
```

After running the N+1 function, this query will show you a single row representing the `items WHERE order_id = $1` statement with a `calls` column sitting at five hundred, which is about as unambiguous a smoking gun as you will ever get in a database investigation.

## Writing the Redeemed Code

Now you write the fix, and the fix follows exactly the lesson from the case study: collect the keys you need first, then ask for everything in one shot using an `IN` clause, letting Postgres do the matching work it was designed to do rather than asking your application to loop and dial the database over and over.

```go
func fetchOrdersBatched(db *sql.DB) {
	start := time.Now()

	rows, err := db.Query(`SELECT id, customer FROM orders LIMIT 500`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var orders []Order
	orderIDs := make([]int, 0, 500)
	for rows.Next() {
		var o Order
		if err := rows.Scan(&o.ID, &o.Customer); err != nil {
			log.Fatal(err)
		}
		orders = append(orders, o)
		orderIDs = append(orderIDs, o.ID)
	}

	itemRows, err := db.Query(`SELECT id, order_id, product, quantity FROM items WHERE order_id = ANY($1)`, pq.Array(orderIDs))
	if err != nil {
		log.Fatal(err)
	}
	defer itemRows.Close()

	totalItems := 0
	for itemRows.Next() {
		var it Item
		itemRows.Scan(&it.ID, &it.OrderID, &it.Product, &it.Quantity)
		totalItems++
	}

	fmt.Printf("Batched version: %d orders, %d items, took %s\n", len(orders), totalItems, time.Since(start))
}
```

The structural difference between this function and the one before it is small on the page but enormous at the database. Instead of five hundred separate conversations, the database now receives exactly two queries no matter whether you are fetching five hundred orders or five hundred thousand. The `order_id = ANY($1)` clause, backed by that index you created earlier, lets Postgres do a single efficient lookup across all the requested keys at once, which is precisely the kind of set-based thinking relational databases were built for in the first place.

## Proving the Fix With Your Own Eyes

Run both functions back to back against the same ten thousand rows, watch the printed durations, and then go check the `pg_stat_statements` table again. You should see the batched version's printed time land somewhere close to what a single `EXPLAIN ANALYZE` of the batch query reports on its own, while the N+1 version's time will be noticeably larger and will keep growing the moment you raise that `LIMIT 500` to `LIMIT 5000`. That growth curve is the real lesson here: the batched version's cost barely moves as the dataset grows, because it is still just two queries, while the N+1 version's cost climbs in a straight line with the number of parent rows, because every additional row is another full round trip. If you want to see this growth with numbers rather than just a feeling, rerun both functions at `LIMIT 100`, `LIMIT 1000`, and `LIMIT 5000`, and plot the three durations for each approach side by side; the batched line will stay nearly flat while the looped line climbs steeply, and that single picture is usually all it takes to convince anyone, including your future self at two in the morning during an incident, why this pattern deserves to be caught in code review rather than in production.

## Closing Thought for the New Engineer

The deepest lesson of this exercise is not really about SQL syntax, it is about where responsibility for query count should live. Code that lets the number of database round trips scale with the size of a result set, rather than staying fixed regardless of how much data comes back, is code that has quietly handed control of your database's fate to whatever data happens to land in it on a given day. A table with ten rows will never complain. A table with ten million rows will eventually complain loudly, usually during a product launch or a traffic spike, which is the worst possible time to be reading this document for the first time. Now that you have watched the queries stack up in a log file with your own eyes and watched them collapse back down to two with a single `IN` clause, you carry that intuition with you permanently, and you will start noticing this shape of bug everywhere, in GraphQL resolvers calling a loader once per field, in template code calling a helper once per row, and in ORM relationship loading that looks clean in the code but hides a loop underneath. Trust that instinct whenever you see a database call sitting inside a `for` loop, and go find out, the way you just did here, whether it is innocent or not.
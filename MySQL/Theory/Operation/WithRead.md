### Read statement

### Table : Customer

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

### Limit Statement

Read data from a limit

```sql
select * from customer where salary>2000 limit 5
```

return 5 data with condition

### MAX and MIN Function Statement 👍

**Find the max and min salary with country `Bangledesh`**

MAX() for find the max value from a table column

```sql
select MAX(salary) from customer where country='Bangladesh`
```

MIN() for find the min value from a table column

```sql
select MIN(salary) from customer where country='Bangladesh`
```

### COUNT() Functions

For counting the number of column in a table with condition.
**Find the number of people where they lived in `Bangladesh`**

```sql
select COUNT(country) from Customer where country='Bangladesh'
```

### AVG() Functions

For find the average of column
**Find the average salary of `Bangladesh` people**

```sql
select AVG(salary) from Customer where country='Bangladesh'
```

### SUM() Functions

For find the sum of total peoplr
**Find the total salary of `Bangladesh` people**

```sql
select SUM(salary) from Customer where country='Bangladesh'
```

### LIKE Statement

The LIKE operator is used in a WHERE clause to search for a specified pattern in a column.
There are two wildcards often used in conjunction with the LIKE operator:
The percent sign `%` represents zero, one, or multiple characters
The underscore sign `_` represents one, single character

**Find all the customer where their name start with `A`ans live in`Bangladesh`**

```sql
select * from Customer
where country='Bangladesh' like 'A%'
```

Other property

| SQL Query                        | Description                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `WHERE CustomerName LIKE 'a%'`   | Finds any values that start with "a"                                         |
| `WHERE CustomerName LIKE '%a'`   | Finds any values that end with "a"                                           |
| `WHERE CustomerName LIKE '%or%'` | Finds any values that have "or" in any position                              |
| `WHERE CustomerName LIKE '_r%'`  | Finds any values that have "r" in the second position                        |
| `WHERE CustomerName LIKE 'a_%'`  | Finds any values that start with "a" and are at least 2 characters in length |
| `WHERE CustomerName LIKE 'a__%'` | Finds any values that start with "a" and are at least 3 characters in length |
| `WHERE ContactName LIKE 'a%o'`   | Finds any values that start with "a" and end with "o"                        |

### IN Operator

The `IN` operator allows you to specify multiple values in a `WHERE` clause.
The `IN` operator is a shorthand for multiple OR conditions.

```sql
select * from Customer
where country in ('Bangladesh','France','UK')
```

`IN` Operator can be used with other `sql statement` also

```sql
select * from Customer
where country in (select country from suppliers)
```

### BETWEEN Statement

`BETWEEN` is used to find data in a specific range.
**Find all people in `Bangladesh` which salary in between 30000 to 4000**

```sql
select * from Customer
where country="Bangladesh" and salary between 30000 and 40000
```

`NOT BETWEEN` is used to find data out of a specific range.
**Find all people in `Bangladesh` which salary in between 30000 to 4000**

```sql
select * from Customer
where country="Bangladesh" and salary not between 30000 and 40000
```

### Aliases Statement

Aliases are used to give a table, or a column in a table, a temporary name.
Aliases are often used to make column names more readable.

#### Aliases column name

```sql
select customer_name as name from Customer where country="Bangladesh"
```

#### Aliases statement used for concate multiple table and give a single name

**Find all the people address who lived in `Bangladesh`**

```sql
select customer_name, concat_ws(', ',address,city,country) from customer where country="Bangladesh"
```

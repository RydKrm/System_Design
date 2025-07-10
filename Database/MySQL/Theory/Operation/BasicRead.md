### Customer Table

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

#### selecting all the element from a table

```sql
select * from table_name
```

#### selecting specific field from a table

```sql
select customer_name,address,city from customer
```

#### Return distinct item which

The primary function of DISTINCT is to ensure that each row in the result set is unique, eliminating any duplicate rows that have the same values in the specified columns.

```sql
select Country from Customer
Output: Bangladesh, India, USA
```

#### With condition

```sql
select * from Customer where country = 'Bangladesh`
```

##### And Conditions

```sql
select * from Customer where Country='Bangladesh' and 'age`= 30
```

#### OR Conditions

```sql
select * from Customer where Country='Bangladesh' and 'age`= 30
```

#### Not Conditions

```sql
select * from Customer where not country='Bangladesh`
```

#### Combining AND, OR and NOT

```sql
SELECT * FROM Customers
WHERE Country = 'Germany' AND (City = 'Berlin' OR City = 'Stuttgart');
```

#### For sorting in asc and desc order

In Ascending order

```sql
SELECT * FROM Customer order by country
```

In Descending order

```sql
SELECT * FROM Customer order by country desc
```

Combining ascending and descending order

```sql
select * from customer order by country asc city desc
```

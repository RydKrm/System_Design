### Union Operator

### Statement

The UNION operator is used to combine the result-set of two or more SELECT statements.

Every SELECT statement within UNION must have the same number of columns
The columns must also have similar data types
The columns in every SELECT statement must also be in the same order

### Order Table

| OrderID | ProductID | Date       | CustomerID |
| ------- | --------- | ---------- | ---------- |
| 1       | 101       | 2024-06-09 | 1          |
| 2       | 102       | 2024-06-10 | 2          |
| 3       | 103       | 2024-06-11 | 3          |
| 4       | 104       | 2024-06-12 | 1          |
| 5       | 105       | 2024-06-13 | 2          |
| 6       | 106       | 2024-06-14 | 3          |
| 7       | 107       | 2024-06-15 | 1          |
| 8       | 108       | 2024-06-16 | 2          |
| 9       | 109       | 2024-06-17 | 3          |
| 10      | 110       | 2024-06-18 | 1          |

### Product Table

| ProductID | ProductName | Price | Quantity |
| --------- | ----------- | ----- | -------- |
| 101       | Apple       | 10.00 | 8        |
| 103       | Orange      | 20.00 | 6        |
| 104       | Pineapple   | 25.00 | 13       |
| 105       | Grape       | 30.00 | 7        |
| 107       | Strawberry  | 40.00 | 9        |
| 108       | Watermelon  | 45.00 | 12       |
| 109       | Kiwi        | 50.00 | 8        |
| 110       | Blueberry   | 55.00 | 14       |

#### Union Product

```sql
select ProductID from Order
union
select ProductID from Product
```

### Output

| ProductID |
| --------- |
| 101       |
| 103       |
| 104       |
| 105       |
| 107       |
| 108       |
| 109       |
| 110       |

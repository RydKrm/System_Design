### JOIN TABLE

### Table Customer

| CustomerID | ContactName    | Country   |
| ---------- | -------------- | --------- |
| 1          | Maria Anders   | Germany   |
| 2          | Ana Trujillo   | Mexico    |
| 3          | Antonio Moreno | Mexico    |
| 4          | John Doe       | USA       |
| 5          | Jane Smith     | Canada    |
| 6          | Alice Johnson  | UK        |
| 7          | Michael Brown  | Australia |
| 8          | Sarah Clark    | Germany   |
| 9          | David Lee      | Japan     |
| 10         | Emily White    | France    |

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
| 102       | Banana      | 15.00 | 11       |
| 103       | Orange      | 20.00 | 6        |
| 104       | Pineapple   | 25.00 | 13       |
| 105       | Grape       | 30.00 | 7        |
| 106       | Mango       | 35.00 | 10       |
| 107       | Strawberry  | 40.00 | 9        |
| 108       | Watermelon  | 45.00 | 12       |
| 109       | Kiwi        | 50.00 | 8        |
| 110       | Blueberry   | 55.00 | 14       |

### Statement

A JOIN clause is used to combine rows from two or more tables, based on a related column between them.

### Type of Table

#### INNER JOIN

The INNER JOIN keyword selects records that have matching values in both tables. <br>
The INNER JOIN keyword selects all rows from both tables as long as there is a match between the columns. If there are records in the "Orders" table that do not have matches in "Customers", these orders will not be shown
**Find customer name and country with their order**

```sql
select Customer.ContactName, Customer.Country from Order
inner join Customer on Order.CustomerID = Customer.CustomerID
```

##### OUTPUT

| ContactName    | Country |
| -------------- | ------- |
| Maria Anders   | Germany |
| Ana Trujillo   | Mexico  |
| Antonio Moreno | Mexico  |
| Maria Anders   | Germany |
| Ana Trujillo   | Mexico  |
| Antonio Moreno | Mexico  |
| Maria Anders   | Germany |
| Ana Trujillo   | Mexico  |
| Antonio Moreno | Mexico  |
| Maria Anders   | Germany |

#### LEFT JOIN

The LEFT JOIN keyword returns all records from the left table (table1), and the matching records (if any) from the right table (table2).

```sql
SELECT Customers.CustomerName, Orders.OrderID
FROM Customers
LEFT JOIN Orders ON Customers.CustomerID = Orders.CustomerID
ORDER BY Customers.CustomerName;
```

| ContactName    | OrderID |
| -------------- | ------- |
| Alice Johnson  | NULL    |
| Ana Trujillo   | 2       |
| Ana Trujillo   | 5       |
| Ana Trujillo   | 8       |
| Antonio Moreno | 3       |
| Antonio Moreno | 6       |
| Antonio Moreno | 9       |
| David Lee      | NULL    |
| Emily White    | NULL    |
| Jane Smith     | NULL    |
| John Doe       | NULL    |
| Maria Anders   | 1       |
| Maria Anders   | 4       |
| Maria Anders   | 7       |
| Maria Anders   | 10      |
| Michael Brown  | NULL    |
| Sarah Clark    | NULL    |

#### RIGHT JOIN

The RIGHT JOIN keyword returns all records from the right table (table2), and the matching records (if any) from the left table (table1).

```sql
SELECT Orders.OrderID, Employees.LastName, Employees.FirstName
FROM Orders
RIGHT JOIN Employees ON Orders.EmployeeID = Employees.EmployeeID
ORDER BY Orders.OrderID;
```

| OrderID | LastName | FirstName |
| ------- | -------- | --------- |
| 1       | Doe      | John      |
| 2       | Smith    | Jane      |
| 3       | Johnson  | Alice     |
| 4       | Brown    | Michael   |
| 5       | Clark    | Sarah     |
| 6       | Lee      | David     |
| 7       | White    | Emily     |
| 8       | Adams    | Chris     |
| 9       | Hall     | Karen     |
| 10      | Lewis    | Tom       |
| NULL    | Turner   | Nina      |
| NULL    | Baker    | Sam       |

#### CROSS JOIN

The CROSS JOIN keyword returns all records from both tables (table1 and table2).

```sql
SELECT Customers.CustomerName, Orders.OrderID
FROM Customers
CROSS JOIN Orders
WHERE Customers.CustomerID=Orders.CustomerID;
```

| ContactName    | OrderID |
| -------------- | ------- |
| Maria Anders   | 1       |
| Maria Anders   | 4       |
| Maria Anders   | 7       |
| Maria Anders   | 10      |
| Ana Trujillo   | 2       |
| Ana Trujillo   | 5       |
| Ana Trujillo   | 8       |
| Antonio Moreno | 3       |
| Antonio Moreno | 6       |
| Antonio Moreno | 9       |

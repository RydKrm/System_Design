## Having clause

The HAVING clause was added to SQL because the WHERE keyword cannot be used with aggregate functions.

#### Customer Table

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

**Select the country which have total people greater than 2**

```sql
select country, COUNT(customerID) from Customer
group by country
having COUNT(customerID) > 2
```

| country    | COUNT(customerID) |
| ---------- | ----------------- |
| Bangladesh | 3                 |

Also that can be used with join and other property

```sql
SELECT Employees.LastName, COUNT(Orders.OrderID) AS NumberOfOrders
FROM (Orders
INNER JOIN Employees ON Orders.EmployeeID = Employees.EmployeeID)
GROUP BY LastName
HAVING COUNT(Orders.OrderID) > 10
```

## Group By Statement

The GROUP BY statement groups rows that have the same values into summary rows, like "find the number of customers in each country".
It statement is often used with aggregate functions (COUNT(), MAX(), MIN(), SUM(), AVG()) to group the result-set by one or more columns.

#### Customer Table

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

**Find the number of people who lived in every city**

```sql
select count(customerId) as number_of_people, city from customer group by city order by count(customerId) desc
```

**Output**

| number_of_people | city     |
| ---------------- | -------- |
| 3                | Dhaka    |
| 2                | Mumbai   |
| 1                | New York |
| 1                | Onterioa |

##### you can also use join and group by together

```sql
select count(Customer.customerID), Customer.city, Order.date from customer
inner join order.customerID = Customer.customerID
group by Customer.city

```

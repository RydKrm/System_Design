### Insert into statement

### Customer Table

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

##### Insert is possible to write into two ways

#### If insert item in specific column

```sql
insert into Customer(customer_name, address, city) values('Mumesh kumar','India','Delhi')
```

#### Insert all the value of a table then column name not not need

```sql
 insert into customer values('Md. Hadin', 'Gulshan', 'Dhaka','Bangladesh', 230000, 33 )
```

### Null values

A field with a NULL value is a field with no value.

If a field in a table is optional, it is possible to insert a new record or update a record without adding a value to this field. Then, the field will be saved with a NULL value.

#### selecting the null values

```sql
select * from Customer where country is null
```

#### select all the value where not null values

```sql
select * from customer where country is not null
```

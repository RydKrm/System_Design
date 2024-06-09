### Update the Table

### Table :- Customer

| customerId | customer_name  | address | city     | country    | salary | age |
| ---------- | -------------- | ------- | -------- | ---------- | ------ | --- |
| 01         | Maria Andes    | Mirpur  | Dhaka    | Bangladesh | 50000  | 30  |
| 02         | Andes Fuliz    | Gulshan | Dhaka    | Bangladesh | 55000  | 28  |
| 03         | Habihibi Bujsa | Mumbai  | Mumbai   | India      | 60000  | 35  |
| 04         | Adam Gonjalez  | Mirpur  | Dhaka    | Bangladesh | 52000  | 32  |
| 05         | James Bond     | Queens  | New York | USA        | 75000  | 40  |
| 06         | Habihibi Bujsa | Mumbai  | Onterioa | Canada     | 58000  | 37  |

### update with condition

```sql
update Customer set name='james D bond', salary=3000 where customerId=5
```

> [!WARNING]
> Be careful when updating records. If you omit the WHERE clause, ALL records will be updated!

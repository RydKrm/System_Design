## Switch Case

In MySQL, you can simulate the functionality of a switch statement using the CASE expression. This is useful for conditional logic within queries.

Syntax of CASE:

```sql
Copy code
CASE
    WHEN condition1 THEN result1
    WHEN condition2 THEN result2
    ...
    ELSE resultN
END
```

Example 1: Simple CASE in a Query
Suppose you have a table employees with a column job_title, and you want to classify employees based on their job titles:

```sql
Copy code
SELECT
    name,
    job_title,
    CASE
        WHEN job_title = 'Manager' THEN 'Leadership'
        WHEN job_title = 'Developer' THEN 'Engineering'
        WHEN job_title = 'Designer' THEN 'Creative'
        ELSE 'Other'
    END AS department
FROM employees;
```

Example 2: Using CASE in UPDATE
You can use CASE in an UPDATE statement to conditionally update values:

```sql
Copy code
UPDATE employees
SET salary = CASE
    WHEN job_title = 'Manager' THEN salary * 1.2
    WHEN job_title = 'Developer' THEN salary * 1.1
    ELSE salary * 1.05
END;
```

Example 3: CASE with Aggregation
If you want to group data based on conditions:

```sql
Copy code
SELECT
    CASE
        WHEN salary < 50000 THEN 'Low'
        WHEN salary BETWEEN 50000 AND 100000 THEN 'Medium'
        ELSE 'High'
    END AS salary_range,
    COUNT(*) AS employee_count
FROM employees
GROUP BY salary_range;
```

## Notes:

The CASE expression is similar to a switch statement in other programming languages.
It is used within SELECT, WHERE, UPDATE, and other SQL clauses.
Ensure you include an ELSE clause to handle unmatched cases (optional but recommended).

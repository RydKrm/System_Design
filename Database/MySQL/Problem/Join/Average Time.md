### Average Time of Process per Machine

[Problem link](https://leetcode.com/problems/average-time-of-process-per-machine/description/)

### Logic

1. create two table
2. one for sum up all the `start` timestamp group by machine_id
3. another for sum up all the `end` timestamp also group by machine_id
4. now join them on `machine_id`
5. now found the ans `machine_id` and `processing_time` by averaging the `sum / total`

### Complexity

- Time Complexity : O(nlogn)
- Space Complexity: O(m)

### CODE

```sql
SELECT
    start_count.machine_id,
    round( (end_count.end_sum - start_count.start_sum) / start_count.total ,3) AS processing_time
FROM
    (SELECT
        machine_id,
        COUNT(*) AS total,
        SUM(timestamp) AS start_sum
    FROM
        Activity
    WHERE
        activity_type = 'start'
    GROUP BY
        machine_id
    ) AS start_count
JOIN
    (SELECT
        machine_id,
        SUM(timestamp) AS end_sum
    FROM
        Activity
    WHERE
        activity_type = 'end'
    GROUP BY
        machine_id
    ) AS end_count
ON
    start_count.machine_id = end_count.machine_id

```

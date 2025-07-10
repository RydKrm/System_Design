### Rising Temperature

[problem link](https://leetcode.com/problems/rising-temperature/description/)

### Approach

Main problem in this question is how to find the previous date and tempareture. LAG() window function can be used to find that. Find previous day temperature and date and compare with current date

### Complexity

- Time complexity: O(nlogn)
- Space complexity: O(n)

### Code

```sql

SELECT
    Id
FROM ( SELECT id,
            temperature,
            recordDate,
            LAG(temperature) OVER (ORDER BY recordDate) AS previous_temperature,
            LAG(recordDate) OVER (ORDER BY recordDate) AS previous_recordDate
        FROM
            Weather
    ) AS subquery
WHERE
    temperature > previous_temperature
    AND DATEDIFF(recordDate, previous_recordDate) = 1
ORDER BY
    id;

```

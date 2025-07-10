## Problem

Generate the following two result sets:

Query an alphabetically ordered list of all names in OCCUPATIONS, immediately followed by the first letter of each profession as a parenthetical (i.e.: enclosed in parentheses). For example: AnActorName(A), ADoctorName(D), AProfessorName(P), and ASingerName(S).
Query the number of ocurrences of each occupation in OCCUPATIONS. Sort the occurrences in ascending order, and output them in the following format:

There are a total of [occupation_count] [occupation]s.
where [occupation_count] is the number of occurrences of an occupation in OCCUPATIONS and [occupation] is the lowercase occupation name. If more than one Occupation has the same [occupation_count], they should be ordered alphabetically.

> [!NOTE]
> There will be at least two entries in the table for each type of occupation
> .

[Problem Link](https://www.hackerrank.com/challenges/the-pads)

## Images

![Image](../../../Images/occupation.png)

## Solution

```sql
select concat(name, '(',left(occupation,1),')') as result from occupations order by result;

select concat('There are a total of ',count(*),' ',lower(occupation),'s.') as totalResult
from occupations
group by occupation
order by count(*), occupation;
```

## Problem

Write a query identifying the type of each record in the TRIANGLES table using its three side lengths. Output one of the following statements for each record in the table:

Equilateral: It's a triangle with sides of equal length.
Isosceles: It's a triangle with sides of equal length.
Scalene: It's a triangle with sides of differing lengths.
Not A Triangle: The given values of A, B, and C don't form a triangle.

[Problem Link](https://www.hackerrank.com/challenges/what-type-of-triangle)

## Images

![Image](../../../Images/triangle_type.png)

## Solution

```sql
select
   case
     when a+b<=c or b+c<=a or c+a<=b then "Not A Triangle"
     when a=b and b=c and c=a then "Equilateral"
     when a=b  or b=c or c=a then "Isosceles"
     when a != b and b != c and c != a then "Scalene"
     end as triangle
 from TRIANGLES
```

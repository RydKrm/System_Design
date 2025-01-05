## Problem

Query the sum of Northern Latitudes (LAT_N) from STATION having values greater than 38.7880 and less than 137.2345. Truncate your answer to decimal places.

Input Format

The STATION table is described as follows:

![alt text](../../../Images/StationRound.jpg)

## Solution

```sql
select round(sum(LAT_N),4) from STATION where LAT_N>38.7800 and LAT_N<137.2345
```

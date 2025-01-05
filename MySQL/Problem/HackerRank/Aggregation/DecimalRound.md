## Problem

Query the following two values from the STATION table:

1.  The sum of all values in LAT_N rounded to a scale of decimal places.
2.  The sum of all values in LONG_W rounded to a scale of decimal places.
    Input Format

The STATION table is described as follows:

![alt text](../../../Images/StationRound.jpg)

### Link

[problemLink](https://www.hackerrank.com/challenges/weather-observation-station-2/problem?isFullScreen=true)

## Solution

```sql
select round(sum(LAT_N),2), round(sum(LONG_W),2) from station;

```

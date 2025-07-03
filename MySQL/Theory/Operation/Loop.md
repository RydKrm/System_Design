## Started

MySQL supports loops in stored procedures and stored functions through control flow statements like LOOP, WHILE, and REPEAT. These are useful for iterating over a set of instructions.

#### Types of Loops in MySQL

`LOOP`

A basic loop that continues until explicitly exited with a LEAVE statement.
WHILE

Repeats as long as a condition is `TRUE`.
`REPEAT`

Executes the block at least once and continues until a condition becomes TRUE.
Example 1: Using `LOOP`
Here is how you can use a simple LOOP to print numbers from 1 to 5.

```sql
Copy code
DELIMITER //

CREATE PROCEDURE LoopExample()
BEGIN
    DECLARE counter INT DEFAULT 1;

    my_loop: LOOP
        -- Exit the loop when counter > 5
        IF counter > 5 THEN
            LEAVE my_loop;
        END IF;

        -- Print the current value of counter
        SELECT counter;

        -- Increment counter
        SET counter = counter + 1;
    END LOOP;
END//
```

DELIMITER ;
To execute:

```sql
Copy code
CALL LoopExample();
Example 2: Using WHILE
This example uses a WHILE loop to sum numbers from 1 to 10.
```

```sql
Copy code
DELIMITER //

CREATE PROCEDURE WhileExample()
BEGIN
    DECLARE counter INT DEFAULT 1;
    DECLARE total INT DEFAULT 0;

    WHILE counter <= 10 DO
        SET total = total + counter;
        SET counter = counter + 1;
    END WHILE;

    SELECT total AS SumOfNumbers;
END//
```

DELIMITER ;
To execute:

```sql
Copy code
CALL WhileExample();
Example 3: Using REPEAT
This example uses a REPEAT loop to print numbers from 1 to 5.
```

sql
Copy code
DELIMITER //

```sql
CREATE PROCEDURE RepeatExample()
BEGIN
    DECLARE counter INT DEFAULT 1;

    REPEAT
        SELECT counter;
        SET counter = counter + 1;
    UNTIL counter > 5
    END REPEAT;
END//
```

DELIMITER ;
To execute:

```sql
Copy code
CALL RepeatExample();
```

## Notes:

Loops are typically used in stored procedures or functions to handle repetitive tasks.
Use LEAVE to exit a LOOP early.
Be cautious of infinite loops by ensuring proper exit conditions.

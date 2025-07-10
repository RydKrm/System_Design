// ! Math Object

// * The JavaScript Math object allows you to perform mathematical tasks on numbers.

// * Math.E        // returns Euler's number
// * Math.PI       // returns PI
// * Math.SQRT2    // returns the square root of 2
// * Math.SQRT1_2  // returns the square root of 1/2
// * Math.LN2      // returns the natural logarithm of 2
// * Math.LN10     // returns the natural logarithm of 10
// * Math.LOG2E    // returns base 2 logarithm of E
// * Math.LOG10E   // returns base 10 logarithm of E

// * Math.round(x)	Returns x rounded to its nearest integer
// * Math.ceil(x)	Returns x rounded up to its nearest integer
// * Math.floor(x)	Returns x rounded down to its nearest integer
// * Math.trunc(x)	Returns the integer part of x (new in ES6)
// * Math.pow(x, y) returns the value of x to the power of y:
// * Math.sqrt(x)   returns the square root
// * Math.abs(x)    returns the absolute (positive) value
// * Math.max()     returns max from list of arguments
// * Math.min()     return min from list of arguments

// ? For generating a random value from 0 to 10
Math.floor(Math.random() * 10); // * Math.random() return a value from 0 to 1 fraction position and multiply it by using 10 make 1 integer out and floor create full integer number

// ? For generating a random number from min to max
let max = 55,
  min = 5;
let random = Math.floor(Math.random() * (max - min + 1)) + min;
// console.log(random);

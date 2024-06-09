// ! JavaScript Data Type

/*
 * 5 type of data type in javascipt
 * 1) string
 * 2) number
 * 3) boolean
 * 4) object
 * 5) function
 */

/*
*  There are 6 types of objects:
* Object
* Date
* Array
* String
* Number
* Boolean
* 
* And 2 data types that cannot contain values:
* null
* undefined
/*
* typeof "John"                 // Returns "string"
* typeof 3.14                   // Returns "number"
* typeof NaN                    // Returns "number"
* typeof false                  // Returns "boolean"
* typeof [1,2,3,4]              // Returns "object"
* typeof {name:'John', age:34}  // Returns "object"
* typeof new Date()             // Returns "object"
* typeof function () {}         // Returns "function"
* typeof myCar                  // Returns "undefined" * variable don't contain any value 
* typeof null                   // Returns "object"

*/

console.log((3.14).constructor);

// ! Js type conversion

/*
 * Variable can be convert to another type by two way
 * 1 -> By using function
 * 2 -> By Automatic
 *
 */

// ? Number to String
let number = 123;
typeof toString(number); //* string

// ? String to Number
let str = "123";
typeof Number(str); // * number

Number("abc"); // * NaN
typeof Number("abc"); // * number

// * convert float number to int number
parseInt(3.14); //* 3

// * convert string to float

parseInt("3.1415"); //* 3

parseFloat("3.1231"); //* number -> 3.1231
parseFloat("321"); //* number -> 321

(22 / 7).toFixed(5); //* type string -> 3.14286

// ? Convert date to number and string

Number(new Date()); //* number -> date
String(new Date()); // * string -> date

// ? convert booleans to string and number
String(false); // * string -> "false"
Number(false); //* 0
Number(true); // * 1

// ? Automatic type convertion

// * 5 + null    // returns 5         because null is converted to 0
// * "5" + null  // returns "5null"   because null is converted to "null"
// * "5" + 2     // returns "52"      because 2 is converted to "2"
// * "5" - 2     // returns 3         because "5" is converted to 5
// * "5" * "2"   // returns 10        because "5" and "2" are converted to 5 and 2

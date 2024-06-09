// ! JavaScript Error

/*
 * an error refers to an unexpected or erroneous situation that occurs during the execution of a program
 * in js try-catch block use to handle the error
 */

/*
 * try block => contain the code
 * catch block => if in try block any error occur that will be handle in catch block but don't stop the other part of code running
 * finally => after handlely the task this block run. finally block always run either error occur or not
 */

/*
 * in catch block, error is an object
 * it has two property 
 * 1. error.name
 * 2. error.message

 */

try {
  let ans = 12;
  ans.toPrecision(500); //* this line create an error
  console.log(ans);
} catch (error) {
  console.log(error.name); //* return the error name
  console.log(error.message); //* error message print here
} finally {
  console.log("first"); // * this block always run here
}

// ? Differnt kind of error

// ? Range Error
try {
  let num = 1;
  num.toPrecision(500); // A number cannot have 500 significant digits
} catch (err) {
  console.log(err.name); // * RangeError
  console.log(err.message); //* toPrecision() argument must be between 1 and 100
}

// ? Syntax error
try {
  eval("alert('Hello)"); // Missing ' will produce an error
} catch (err) {
  console.log(err.name); // * SyntaxError
  console.log(err.message); //* Invalid or unexpected token
}

// ? Reference Error
try {
  let x = 1;
  x = y + 1; // y cannot be used (referenced)
} catch (err) {
  console.log(err.name); // * ReferenceError
  console.log(err.message); //* y is not defined
}

// ? Type Error

try {
  let num = 1;
  num.toUpperCase(); // You cannot convert a number to upper case
} catch (err) {
  console.log(err.name); // * TypeError
  console.log(err.message); //* num.toUpperCase is not a function
}

// ? URI ERROR
try {
  let num = 1;
  decodeURI("%%%"); // You cannot URI decode percent signs
} catch (err) {
  console.log(err.name); // * URIError
  console.log(err.message); //* URI malformed
}

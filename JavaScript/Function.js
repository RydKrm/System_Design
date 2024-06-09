// * Function

// * Function create

function sum(a, b) {
  return a + b;
}
console.log(sum(5, 6));

// * function expression
const sub = function (a, b) {
  return a - b;
};
console.log(sub(6, 4));

// * in JS function can be define with build-in JS constructor Function()

const mul = new Function("a", "b", "return a*b");
console.log(mul(3, 4));

// ? JavaScript function support Hoisting
// * js function can be called before declare

console.log(div(18, 6));
function div(a, b) {
  return a / b;
}

// ? Self-Invoking function
// * A self-invoking expression is invoked (started) automatically, without being called.
// * self invoking function automatically called when the line will execute

(function () {
  console.log("self invoking function");
})();

// * self invking function can also pass parameter

(function (a, b) {
  console.log("sum => ", a + b);
})(4, 5);

// ? Arrow Function

// * Arrow functions allows a short syntax for writing function expressions.
// * if function body has single statement then not need the curly and "return" keyword to return
// * for multiple line statement need curl and return
// * general function is hoisted but arrow function is not hoisted
// * Arrow does not contain "this" key word

const PowerOfTwo = (n) => {
  let pow = 2 ** n;
  return pow;
};
PowerOfTwo(4); //* 16

const Double = (b) => 2 * b;
Double(2); // 4

// ? js Function parameter

// * passing function parameter are not type defined
// * a default value can be set in function passing parameter
const fullName = (firstName = "Riyad ", lastName = "Karim") => {
  return firstName + lastName;
};

// * Default value work, when the function called and argument not pass dafault value will work
console.log(fullName()); // Riyad Karim
// * if default value not set the parameter value will be undefine
console.log(fullName("John ", "Deo")); //* John Deo

// ? Function rest parameter
// * rest parameter is used when an indefined number of value passed as arguments in function, they are store in a array

const NumberSum = (...value) => {
  // * values = [1,2,3,4,5,6,7,8,9,10]
  let sum = 0;
  value.forEach((item) => (sum += item));
  return sum;
};

console.log(NumberSum(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));

// ? Arguments are passed by value
// ? Objects are passed by reference

// * ### Closure 🙂

// * A closure is create when a function is define inside another function.

const createCounter = () => {
  let cnt = 0;
  return function () {
    return cnt++;
  };
};

const count = createCounter();
// * Now the count variable has the returning function with cnt variable
count(); // * return 1
//* because count => 1) cnt variable 2) inner function.
//* calling the function will increase the variable
count(); //* return 2
count(); //* return 3
console.log(count()); // * 3

// * Returning the function will not only return the inner function also return the variable **cnt. This is called lexical scoping .  and the variable is called the lexical scoping**

// * Closure can remember the values of it’s outer scope.

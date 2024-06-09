// ! Scope in js

/*
 * JavaScript variables have 3 types of scope:
 * Block scope
 * Function scope
 * Global scope
 */

// ? Block Scope
// * if a variable declare inside a block in cannot be access outside of that block
{
  let x = 2;
}
//  console.log(x); //*error x is undefine
// * give an error cause x is declare inside a block it cannot be asccess out side that block
// * let has block scope

{
  var x = 2;
}
// console.log(x); //* 2
// * var is used before ES6 ,
// * "var" don't have block scope

/*
 * Before ES6 js has only functional scope and global scope
 * after ES6 js introduce new scope => block scope
 * which is related to new two keyword "const" and "let" for variable declaration
 * before that "var" is use to decalare variable
 *
 * "var" does not have block scope
 * "const" and "let" has block scope
 */

// ? Function Scope

/*
 * if a variable declare inside a function, it cannot be access outside of function
 *
 */

const block = () => {
  let x = 14;
  //  console.log(x); //* 14
};
// console.log(x) //* error x is not define
block();
debugger;
// ? Global Scope
// * a variable declare outside any scope
// * which can be access anywhere from the code
let y = 5;
console.log(y);

// ! Hoisting

/*
 * variable declare with "var" can be used before declare cause var don't have block scope
 * Hoisting automatically pull al the variable at the top
 *
 *
 */

abc = 35;
console.log(abc); // * 35
var abc;

// xyz = 43; //* xyz is not define
// console.log(xyz); //* xyz is not define
let xyz;

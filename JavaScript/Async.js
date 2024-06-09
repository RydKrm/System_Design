// ! Callback function

// ? Callback is a function that can passed as argument to another function.

// * Example

// * this will print the result
const showResult = (result = 9) => console.log("Result =>", result);

// * this function take two variable and a callback function
// * callback function pass reference
const calculate = (a, b, callback) => {
  let sum = a + b;
  // * at last the callback function will call
  // ? if we direct call showResult then that will be static we cannot call other function
  // ? while creating dynamically call, a callback function comes to role
  // ? we can use another function
  callback(sum);
};

// calculate(4, 5, showResult);

// ! Asynchronous Function

/*
 * async function run parallaly with other other code
 * JS code execute line by line from top to bottom
 * when it get async function, it run this function parallaly instand of blocking the execution
 * then, when the async function return, it show the output
 *
 *
 */

// ? difference between the async and sync code

console.log("before sync function");

const syncFunc = () => {
  for (let i = 0; i < 3000000000; i++) {
    // do something
  }
  console.log("output of sync function ");
};

syncFunc();
console.log("After sync functiom");

/*
 * result show this way =>
 *  " befone sync function (take some fraction of second)
 *    output of sync function
 *    after sync function
 *  "
 * so it block excution untile syncFunc() return
 *
 */

// ? Now same working for async

console.log("before async function");

const asyncFunc = () => {
  for (let i = 0; i < 3000000000; i++) {
    // do something
  }
  console.log("output of async function ");
};

asyncFunc();
console.log("Aftera sync functiom");

/*
 * result show this way =>
 *  " befone async function
 *    after async function (take some fraction of second)
 *    output of async function
 *  "
 * so it block did not  excution untile asyncFunc() return
 *
 */

// ? setTime() is a buildin async function

console.log("before timeout");
setTimeout(() => {
  console.log("result of setTime");
}, 2000);
console.log("after timeout");

/*
 * output will be this way
 * before timeout
 * after timeout (2s pause)
 * result of setTime
 */

// ? Set Interval function is also a async function
let interval = setInterval(() => {
  console.log("set interval ... ");
}, 3000);

setTimeout(() => {
  clearInterval(interval);
  console.log("Breaking the setIntervel ");
}, 10000);

console.log("========= after setInterval==========");

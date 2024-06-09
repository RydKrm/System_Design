// ! Promise
// * A Promise is an Object that links Producing code and Consuming code

// ? create a promise

console.log("Before Promise");

// * create a promise which take "resolve" for success result and "reject" for "unsuccess" result
let myPromise = new Promise((resolve, reject) => {
  let cnt = 0;
  for (let i = 0; i < 1000000000; i++) {
    if (i % 3 === 0) cnt++;
  }

  // * reject() return reject message
  // * resolve() return sucess result

  if (cnt < 40) resolve("success");
  else reject("Rejected");
});

myPromise.then((res) => console.log(res)).catch((err) => console.log(err));
console.log("After Promise ");

// * the reason why "After Promise is printing before Rejected" because
// * promise body is sync but when we consume promise with "then-catch" that will be async
// * check the next example

new Promise(function (resolve, reject) {
  console.log("foo");
});
console.log("bar");

console.log("0");
new Promise((resolve, reject) => {
  console.log("1");
  resolve();
}).then(() => {
  console.log("2");
});
console.log("3");

// * print -> 0 1 3 2

// * execution starting with 0
// * then come into promise and print 1
// * then print 3 which is outside the promise block because of then async behavier
// * then print 2 inside the then block

// ?  promise can be consume after it created
new Promise((resolve, rejected) => {
  let error = false;
  if (!error) resolve({ name: "JavaScript", version: "ES6" });
  else rejected("Error occur");
})
  .then((res) => console.log(res))
  .catch((err) => console.log(err));

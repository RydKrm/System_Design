// * Method is nothing more than properties that hold function values.
let rabbit = {};
rabbit.speak = function (line) {
  console.log(`The rabbit says '${line}'`);
};
rabbit.speak("I'm alive.");
// → The rabbit says 'I'm alive.'

const findOdd = (arr) => {
  return arr.filter((item) => item % 2 == 1);
};

console.log(findOdd([1, 23, 4, 5, 6, 8, 7, 9]));
console.log(findOdd);

/* 
 * 
* In JavaScript, findOdd and findOdd() are different entities:

* findOdd:
* This is a function declaration. When you write const findOdd = ..., you are declaring a 
* function named findOdd and assigning it a value. However, the function is not executed at 
* this point; it is simply defined. You can think of findOdd as a reference to the function.
* findOdd():
* This is a function call. When you write findOdd(), you are actually invoking/calling the * function named findOdd. This executes the code inside the function body.
* So, findOdd is a reference to the function, while findOdd() is the actual execution of the function.
*/

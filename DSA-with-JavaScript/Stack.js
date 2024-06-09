/*
  * Stack is a LIFO Data Structure 
*/

let stk = [2,3,4,5,10,5,8];
stk.push(14)
console.log(stk);
const lastItem = stk.pop();

const secondLastItem = stk.pop();

console.log("new stack => ",lastItem,secondLastItem, stk);



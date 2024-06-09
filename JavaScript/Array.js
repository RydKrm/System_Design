// ! Array Learning

// * crate array

let number = [2, 3, 4, 5, 1, 112, 3];

let newNumber = new Array(12, 32, 1, 14, 16, 21, 18);

const bookList = [];
bookList[0] = "Js";
bookList[1] = "Python";
bookList[2] = "Node.js";

bookList[3] = {
  name: "Learn MongoDB",
  publish: "2024",
};

// * array length find
// console.log("Array length =>", bookList.length);

// * Array forEach() loop
// bookList.forEach((item) => console.log(item));

bookList[3] = "MongoDB";

/*
 * differce between object and array =>
 * array use numbered indexes
 * object use named index
 */

// * it will create an array with 1 elements with value 40
const points = [40];

// * it will create an array with 40 elements with undefine value
const newPoints = new Array(40);

// console.log("Type of array => ", typeof points); // * object
// * in javascript it will return an object because array is an object in js
// * to check an item array or not

// console.log("checking for object => ", Array.isArray(points)); // * true

// ! Array Method

// * to find the length
// console.log(bookList.length); //* 5

// * convert array to string
// console.log(bookList.toString);

// * access a position of array with at() and array[]
// console.log(bookList[2]); //* learn node.js
// console.log(bookList.at(3)); //* Learn MongoDB

// console.log(bookList[-2]); //* undefine
// console.log(bookList.at(-3)); //* referce at position 3 index

// * array join method
// * convert array to string with joining with () methode passing elements
// console.log(bookList.join(" , "));
// console.log(typeof bookList.join(" , "));

// ? Using array as a stach

// * push and pop method
// * pop method delete the last element
bookList.pop();

// * push method add an elements in the end
bookList.push("Express.js");
// console.log(bookList);

// ? Using array as a queue
// * shift() and unshift() method

// return the value of first element in array
const first = bookList.shift();
// console.log(first); //* get the first position

// * insert an element in the start position
bookList.unshift("Javascript");
// console.log(bookList);

// * delete item from array , it will make the position undefined
// * delete bookList[1];
// console.log(bookList[1]); // * undefine

// * joining two array with concate() method

const newArray = bookList.concat(number);
// console.log(newArray);
const mergeArray = [...bookList, ...number];
// console.log(mergeArray);

// * concate many sub array with one array
const myArr = [
  [1, 2],
  [3, 4],
  [5, 6],
];
const newArr = myArr.flat();
// console.log(newArr); // * 1 2 3 4 5 6

// * add item into middle of array and remove
// * array splice()

bookList.splice(2, 0, "CSS", "React.js");
// * first @param 2 means where to insert item
// * second @param 0 means how many item need to remode
// * rest of the @param insert the in the position

// ? bookList.splice(0, 2);
// * remove 2 elements from 0 index

// * remove an item with out altering the main array
const newBookList = bookList.toSpliced(0, 2);

// * array slice out from an index
// * slice out an item from 4 position to end
// console.log(bookList.slice(4));

// * slice out from array first or from point to point
// * slice out from index 2 to index 3
// console.log(bookList.slice(2, 3));

// console.log(newBookList);

// ! Array Searching method

// ? find the index of an item
// * array.indexOf()
// * return -1 if item not found
// * if item occur more then one return the first occurence
// * Time complexity O(n)

bookList.indexOf("CSS"); //* 2
bookList.indexOf("PHP"); // * -1
// * second param define from where to start search
bookList.indexOf("Learn Node.js", 1); // * 2

// ? also Find the lastIndexof() define the last index of item
bookList.lastIndexOf("CSS"); //* 2

// ? checking for array has an index or not
// * array.includes() return true for find and false for not
bookList.includes("CSS"); // * true
bookList.includes("Learn PHP"); //* false

// ? array.find()
// * using to find an element from array
// * it will take a callback function that return every item of array
// * in return a condition can be set, if true that function return the value

const item = number.find((item) => item < 10);
// console.log(item);
// * in find => 10
// * in not find => undefined

// ? array.findIndex()
// * the difference between array.findIndex() and array.indexOf()
// * a condition can be set in array.findIndex() because it will take a call back function
let index = number.findIndex((item) => item === 2); //* 0 position condition true
index = number.findIndex((item) => item === 33); //* -1 => item not found
index = number.findIndex((item) => item > 100); // * 5 position condition true

// ? array.findLastIndex()
// * find the last index of item
index = number.findLastIndex((item) => item === 1); //* 4

// console.log(index);

// ! Array Sorting

// ? Array string sorting
// * sort() method
// * JavaScript use
let sort = bookList.sort();

// * Sort in reverse order  => sort() + reverse()
// console.log(sort.reverse());

// * sort array without altering the main array
sort = bookList.toSorted();

// * Same for reverse, without reversing the main array
let reverse = bookList.toSorted().toReversed();

// console.log(reverse);

// ? Array numeric sorting
// * ascendring order sorting
sort = number.sort((a, b) => a - b);

// * decendring order sorting
sort = number.sort((a, b) => b - a);
// console.log(sort);

// ? Shuffle an aray
let shuffle = number.sort(() => 0.5 - Math.random());

// console.log(shuffle);

// ? find the Max and Min value from the array
/*
 * use spread operator which will convert the array into individual item and Math.max() will find the max number  same for Math.min()
 */

let max = Math.max(...number);
let min = Math.min(...number);

// console.log("max =>", max, " min => ", min);

// ! Js Array Iterator

// * forEach() iterate over an array

number.forEach((item) => {
  //   console.log(item);
});

// ? array.map()
// * create an new array by performing the function and store  return value
// * array.map() will take each item and multiply it with 10 and return

let newAr = number.map((item) => item * 10); // 30,1120, 40, 50, 40, 10, 20

// ? array.flatMap()
// * after performing the map() method, it will shuffle the array
// * it will iterate over the array then create a new array with shuffleing the value

newAr = number.map((item) => item * 2);

// ? Array.filter()
// * filter method iterate over the array and return those element which is pass the condition
newAr = number.filter((item) => item < 5);

// ? Difference between filter and map
// * map iterate over all the element and store the function output
// * filter iterate over all element and store only those element which pass the condition

// console.log(newAr);

// ? array.reduce()
// * it will iterate over all element and produce one element by doing any operation
// * start from left, and take one item each item and calculate the total
// * total is the accumulator, item is the counter

let oneItem = number.reduce((item, total) => total + item, 0);

// ? Array.reduceRight()
// * it work as same as array.reduce() instand of item from right to left
oneItem = number.reduce((item, total) => total + item, 0);

// ? Array.every()
// * it will check every item is pass the the condition or not
// * true => pass all item, false => not pass a single item

oneItem = number.every((item) => item < 200); //* true => every item pass the condition

// ? Array.some()
// * check if one element pass the condition or not
oneItem = number.some((item) => item < 10); // * true => atleast one item pass the test case

// console.log(oneItem);

// ? Object to array

let BookStore = {
  name: "Old Book Seller",
  owner: "Mr. John Deo",
  total_book: 20,
  currentBook: 18,
  price: 10,
  isOpen: true,
  since: 2020,
};

// ? Object.keys()
// * take an object and return an array with only key's of object
let toArr = Object.keys(BookStore); //* ["name","owner","total_book","currentBook","price","isOpen","since"]

// ? Object.entries()
// * take an object and return an nested array where each nested element have [key,value]

toArr = Object.entries(BookStore);
/*
 * [
 * [ 'name', 'Old Book Seller' ],
 * [ 'owner', 'Mr. John Deo' ],
 * [ 'total_book', 20 ],
 * [ 'currentBook', 18 ],
 * [ 'price', 10 ],
 * [ 'isOpen', true ],
 * [ 'since', 2020 ]
 * ]
 */
console.log(toArr);

// ! Set method in Javascript

// * Set Create an collection of unique values. Each value can occur only once

// ? Create an empty set
let number = new Set();
// ? also create with value
number = new Set([2, 3, 12, 3, 4]); // * Set(4) { 2, 3, 12, 4 }
//  * 3 occur only one

// * add an item into the set
number.add(5);

// * can be iterate using iterator
// number.forEach((item) => console.log(item));

// * return an object with set values
let iterate = number.values(); // * [Set Iterator] { 2, 3, 12, 4, 5 }

// * delete item from set
number.delete(3);

// * check item in the array or not
let check = number.has(5); // * true
check = number.has(6); // * false

// * return the size of the set
let sz = number.size; // * 4 -> size of the set

// console.log(sz);
// console.log(number);

// ! Map method in Javascript

// * Map is a key value pair where key can be any data type. Map can hold only unique item
// * Also map remembers the original insertion order ot the keys

let BookPrice = new Map();

BookPrice = new Map([
  ["Book_1", 100],
  ["Book_2", 200],
  ["Book_3", 500],
  ["Book_4", 600],
  ["Book_5", 400],
]);

// * Add a new item into the map
BookPrice.set("Book_6", 700);

// * get the Map size
let singleBook = BookPrice.get("Book_2");
sz = BookPrice.size;

// * Delete Item from the map
BookPrice.delete("Book_3");

// * checking for item exists or not
check = BookPrice.has("Book_4");

// * Iterate over a map
BookPrice.forEach((value, key) => {
  console.log(key, " => ", value);
});

console.log(BookPrice);

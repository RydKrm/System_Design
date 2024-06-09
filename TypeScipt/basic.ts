let language: string = "Bangle";
console.log(language);

let list: string[] = ["apple", "banana"];

let list2: Array<string> = ["javascript", "python", "golang"];

let newList = list2.forEach((item) => console.log(item));

// *Enum
enum Color {
  red,
  green,
  blue,
}

const firstColor: Color = Color.blue;

console.log(Color, firstColor);

// Tuples
console.log("Tuples --------------\n\n ");

// *TypeScript tuples are a specific data type that allows you to express an array where the type of a fixed number of elements is known, but they don't have to be of the same type
//* tuple contain value as it is declares, where the string is declare , cannot contain other tye of data structure
let tupleList: [string, number, boolean];
tupleList = ["riyad", 100, true];
console.log(tupleList);

// Any Data type
// any type variable can contain any type of data

let data: any = [];
data.push("riyad");
data.push(100);
data.push(true);

console.log(data);

//* void type data

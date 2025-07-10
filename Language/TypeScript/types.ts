// Union
// With a union, you can declare that a type could be one of many types.

let phoneNumber: string | number;

// ? phoneNumber can only hold `string` or `number`

type doorStatus = "locked" | "unlocked"
// doorStatus is a type which can hold only `locked` or `unlocked` value

let mainDoor: doorStatus;
mainDoor = "locked"

// Explicit Types
// * In TypeScript, explicit types refer to the practice of explicitly declaring the types of variables, function parameters, return values, and other entities. 

// * Explicitly declare variable 
let age: number, userName: string;
age = 25;
userName = "Riyad"

// * Explicitly declare function
const addTwoNumber = (firstNumber: number, secondNumber: number): number => {
    return firstNumber + secondNumber
}

// * Type Aliases 
// * By that one create custom type mixing with any other types

type points = number | string

const addTwoVariable = (first: points, last: points): any => {
    if (typeof first !== typeof last) return new Error("type not matched")

    if (typeof first === 'number' && typeof last === 'number')
        return first + last;
    else if (typeof first === 'string' && typeof last === 'string')
        return first + last
}

// console.log(addTwoVariable(12, "Riyad"));

// * Extending type via intersections
type Animal = {
    name: string,
    age: number
}

type Bear = Animal & {
    lived: number
}


// Primitives Types 
// String, number, boolean

// contextual typing 

// Type Annotations on variable 
// Added a type after declare the variable 
let fullName: string = "Riyad"

// Type set on function 

// while creating function type annotation can be added on both input parameter and output like 

function averageNumber(firstName: number, secondNumber: number): number {
    return (firstName + secondNumber) / 2
}

const average = averageNumber(12, 23)
// console.log(average);

// Create error 
// const averageError = averageNumber("riyad", 15)
// Argument of type 'string' is not assignable to parameter of type 'number'

// Anonymous Functions 
// The input parameter and output type assign to the function according to it's call 
const names = ["Alice", "Bob", "Eve", 25]

// Anonymous function called with .forEach() 
names.forEach(name => {
    console.log(name)
    console.log(typeof name);
})
// Type of name is assign from names array 

// Function Optional Parameters
// It will pass with `?` sign. To use optional parameter with first check it exists or not \

function printName(fullName: { first: string, last?: string }) {
    if (fullName.last !== undefined) {
        console.log(`My name is ${fullName.first} ${fullName.last}`);
    } else {
        console.log("My name is ", fullName.first);

    }
}

// Directly console.log(fullName.first + fullName.last) will give me an error 
//  Error - might crash if 'obj.last' wasn't provided!

// Union Types 
// TypeScript’s type system allows you to add many types with existing ones using a large variety of operators. 

let ID: number | string = "MyName"
ID = 123
// TypeScript will only allow an operation if it is valid for every member of the union. For example, if you have the union string | number, you can’t use methods that are only available on string

function printId(id: number | string) {
    if (typeof id == "string")
        console.log(id.toUpperCase());
}
// Directly printing `console.log(id.toUpperCase())` will give an error because number type dose not have .toUpperCase() method
//   Property 'toUpperCase' does not exist on type 'string | number'.
//         Property 'toUpperCase' does not exist on type 'number'.
//  The solution is added an `if()` statement to narrow down the type 

// Type Aliases 
// To create a new type with combaining other type

type UserId = number | string

type User = {
    name: string,
    age: number,
    isAdmin: Boolean
}

function fullDetails(user: User) {
    console.log(`Full name : ${user.name} \n Age : ${user.age} \n isAmin : ${user.isAdmin}`);
}

// Interface 
// An interface declaration is another way to name an object type

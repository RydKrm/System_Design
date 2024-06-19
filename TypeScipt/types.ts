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

### Function Signature / Called Signature

It Define the shape of function. what type of parameter function take input and return type parameter output.

```typescript
type funcShape = {
  (first: string, last?: string): number;
};

const createShape: funcShape = (first, last) => {
  if (last) {
    return first.length + last.length;
  } else return first.length;
};

console.log(createShape("twi"));
```

### Function Overloading

Function overloading in TypeScript allows you to define multiple signatures for a function, providing different ways
to call it while keeping type safety. This is particularly useful when a function can handle different types or
numbers of arguments and needs to behave differently based on the input.

```typescript
function oneOrThree(first: number): number;
function oneOrThree(first: number, second: number, third: number): number;

function oneOrThree(first: number, second?: number, third?: number): number {
  if (second && third) {
    return first + second + third;
  }

  return first;
}

// That Function take either one argument or three arguments

console.log(oneOrThree(15));
console.log(oneOrThree(12, 25, 3));
console.log(oneOrThree(12, 23)); // this create error
```

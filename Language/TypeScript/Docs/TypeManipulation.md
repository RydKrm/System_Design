### `keyof` Type Operator

The `keyof` operator in TypeScript is a type operator that takes an object type and produces a union of its keys. It's useful for creating more flexible and type-safe code, especially when working with dynamic object keys

```TypeScript
type Person = {
  name: string;
  age: number;
};

type PersonKeys = keyof Person; // "name" | "age"
// type PersonKeys = "name" | "age"

let newPerson:PersonKeys = "name" ; //  it's okay

let newPersonPhone:PersonKeys = "phone"; // Error Type '"phone"' is not assignable to type 'keyof Person'

function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// This function takes two arguments  and return object

const person: Person = { name: "Alice", age: 30 };

const name = getProperty(person, "name"); // Valid, type is string
const age = getProperty(person, "age"); // Valid, type is number
// const invalid = getProperty(person, "address"); // Error: Argument of type '"address"' is not assignable to parameter of type 'keyof Person'.


```

### `typeof` Type Operator

TypeScript adds a typeof operator you can use in a type context to refer to the type of a variable or property

```typescript
let s = "hello";
let n: typeof s;
```

### Indexed Access Types

We can use an indexed access type to look up a specific property on another type

```typescript
type Person = { age: number; name: string; alive: boolean };
type Age = Person["age"]; // type Age = number
type T1 = Person["age" | "name"]; //type T1 = number | string
```

### Conditional Types

In typescript condition can be set based on some conditions

```typescript
interface Animal {
  live(): void;
}

interface Dog extends Animal {
  woof(): void;
}

type Example1 = Dog extends Animal ? number : string; // type Example1 = number
type Example2 = RegExp extends Animal ? number : string; //type Example1 = string
```

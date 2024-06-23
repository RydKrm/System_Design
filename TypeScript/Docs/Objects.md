### Object Types

In JavaScript, the fundamental way that we group and pass around data is through objects. In TypeScript, we represent those through object types.

```typescript
function greet(person: { name: string; age: number }) {
  return "Hello " + person.name;
}
```

Using Interfaces

```typescript
interface Person {
  name: string;
  age: number;
}

function greet(person: Person) {
  return "Hello " + person.name;
}
```

Using Type Alias

```typescript
type Person = {
  name: string;
  age: number;
};

function greet(person: Person) {
  return "Hello " + person.name;
}
```

#### Read only property

Properties can be pass on read only type which can not be change during the block

```typescript
type Person = {
  name: string;
  readonly age: number;
};

function greet(person: Person) {
  person.age = 15; // Cannot assign to 'prop' because it is a read-only property.
  return "Hello " + person.name;
}
```

### Extending Types

Interface can be extendable using the `extends` keywords

```typescript
interface BasicAddress {
  name?: string;
  street: string;
  city: string;
  country: string;
  postalCode: string;
}

interface AddressWithUnit extends BasicAddress {
  unit: string;
}
```

Interface also can extends multiple interfaces

```typescript
interface Colorful {
  color: string;
}

interface Circle {
  radius: number;
}

interface ColorfulCircle extends Colorful, Circle {}

const cc: ColorfulCircle = {
  color: "red",
  radius: 42,
};
```

### Intersection Types

interfaces allowed us to build up new types from other types by extending them. TypeScript provides another construct
called intersection types that is mainly used to combine existing object types

```typescript
interface Colorful {
  color: string;
}
interface Circle {
  radius: number;
}
function draw(circle: Colorful & Circle) {
  console.log(`Color was ${circle.color}`);
  console.log(`Radius was ${circle.radius}`);
}

// okay
draw({ color: "blue", radius: 42 });

// oops
draw({ color: "red", raidus: 42 });
// Object literal may only specify known properties, but 'raidus' does not exist in type 'Colorful & Circle'. Did you mean to write 'radius'?
```

#### Interfaces vs. Intersections

| Interfaces                                                   | Intersections                   |
| ------------------------------------------------------------ | ------------------------------- |
| Define the Structure of objects it can be extended and merge | Combine any type, more flexible |
| Can be extends with `extends` key word                       | can not be extends              |
| Can declare multiple time which merge type                   | can not declare multiple type   |

#### Interfaces

```typescript
interface A {
  x: number;
}

interface B extends A {
  y: number;
}

interface A {
  z: number; // Merges with the first definition of A
}

const example: B = {
  x: 1,
  y: 2,
  z: 3, // z is required due to interface merging
};
```

#### Intersection Example

```typescript
type A = {
  x: number;
};

type B = {
  y: number;
};

type C = A & B;

const example: C = {
  x: 1,
  y: 2,
};

type StringOrNumber = string | number;
type Named = { name: string };

type NamedStringOrNumber = Named & StringOrNumber;

const example2: NamedStringOrNumber = {
  name: "John",
  toString: () => "example",
  // This will not work because 'number' type does not fit
  // value: 123,
};
```

### Type gard

When a condition or logic is decided based on type of variable that will called `Type Gard`. Type guards are expressions that perform runtime checks to ensure a variable is of a specific type. TypeScript uses these checks to narrow the type within the guarded block.

```typescript
function padLeft(value: string | number, padding: string | number): string {
  if (typeof padding === "number") {
    // Here, TypeScript knows `padding` is a number
    return Array(padding + 1).join(" ") + value;
  }
  if (typeof padding === "string") {
    // Here, TypeScript knows `padding` is a string
    return padding + value;
  }
  throw new Error(`Expected string or number, got '${padding}'.`);
}
```

### Truthiness Narrowing

When apply condition based on true false to narrowing.

```typescript
function onlineUser(numberOfUser: number): string {
  if (numberOfUser) {
    return ` ${numberOfUser} people is online now `;
  }
  return `No user online `;
}
```

### `in` Operator Narrowing

JavaScript has an operator for determining if an object or its prototype chain has a property with a name: the in operator. TypeScript takes this into account as a way to narrow down potential types.

```typescript
type Fish = { swim: () => void };
type Bird = { fly: () => void };

function move(animal: Fish | Bird) {
  if ("swim" in animal) {
    return animal.swim();
  }

  return animal.fly();
}
```

### Assignments

When we assign to any variable, TypeScript looks at the right side of the assignment and narrows the left side appropriately

```typescript
let x = Math.random() < 0.5 ? 10 : "hello world!";
x: string | number;
x = 1;
// while type of x is string or number so assigning string or number would not be a problem
x = "goodbye!";

// But assigning other type of variable could give error
x = true; // Type 'boolean' is not assignable to type 'string | number'.
```

### Discriminated unions

Discriminated unions are a pattern where types in a union share a common property that allows TypeScript to narrow the type based on the value of that property.

```typescript
interface Car {
  kind: "car";
  make: string;
  model: string;
}

interface Truck {
  kind: "truck";
  payloadCapacity: number;
}

type Vehicle = Car | Truck;

function getVehicleInfo(vehicle: Vehicle) {
  switch (vehicle.kind) {
    case "car":
      // Here, TypeScript knows `vehicle` is a Car
      console.log(`Car make: ${vehicle.make}, model: ${vehicle.model}`);
      break;
    case "truck":
      // Here, TypeScript knows `vehicle` is a Truck
      console.log(`Truck payload capacity: ${vehicle.payloadCapacity}`);
      break;
  }
}
```

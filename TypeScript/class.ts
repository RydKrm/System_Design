// class Employ {
//   #id: number; //PRIVATE PROPERTIES
//   name: string;
//   address: string;

//   constructor(id: number, name: string, address: string) {
//     this.address = address;
//     this.#id = id;
//     this.name = name;
//   }

//   getAddress(): string {
//     return `${this.name} address is ${this.address}`;
//   }
// }

// class Manager extends Employ {
//   constructor(id: number, name: string, address: string) {
//     super(id, name, address);
//   }
//   getAddress(): string {
//     return `${this.name} is visiting ${this.address}`;
//   }
// }

// const person = new Employ(1, "Riyad", "Mirpur 2");

// // console.log(person.getAddress());

// const manager = new Manager(2, "Mr. Manager", "Dhaka");
// // console.log(manager.getAddress());

// class Student {
//   fullName: string;
//   constructor(firstName: string, lastName: string) {
//     this.fullName = `${firstName} ${lastName}`;
//   }
// }

// interface Person {
//   firstName: string;
//   lastName: string;
// }

// function greeter(person: Person): string {
//   return `Hello, ${person.firstName} ${person.lastName}`;
// }

// class Point {
//   x = 0;
//   y = 12;
// }

// const pt1 = new Point();

// console.log(`${pt1.x} ${pt1.y}`);

// class badGreeter {
//   name: string;

//   constructor() {
//     this.name = "hello";
//   }
// }

// class Base {
//   k = 4;
// }

// class Derived extends Base {
//   constructor() {
//     super();
//     // Prints a wrong value in ES5; throws exception in ES6
//     console.log(this.k);
//     // 'super' must be called before accessing 'this' in the constructor of a derived class.
//   }
// }

// class Thing {
//   _size = 0;

//   get size(): number {
//     return this._size;
//   }

//   set size(value: string | number | boolean) {
//     let num = Number(value);

//     // Don't allow NaN, Infinity, etc

//     if (!Number.isFinite(num)) {
//       this._size = 0;
//       return;
//     }

//     this._size = num;
//   }
// }

class BookList {
  name: string;
  description: string;
  readonly numberOfPage: number | string;
  readonly author: string;
  readPage: string;

  constructor(
    name: string,
    description: string,
    numberOfPage: number,
    author: string,
    readPage: string
  ) {
    this.name = name;
    this.description = description;
    this.numberOfPage = numberOfPage;
    this.author = author;
    this.readPage = readPage;
  }
}

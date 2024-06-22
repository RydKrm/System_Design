class Employ {
  #id: number; //PRIVATE PROPERTIES
  name: string;
  address: string;

  constructor(id: number, name: string, address: string) {
    this.address = address;
    this.#id = id;
    this.name = name;
  }

  getAddress(): string {
    return `${this.name} address is ${this.address}`;
  }
}

class Manager extends Employ {
  constructor(id: number, name: string, address: string) {
    super(id, name, address);
  }
  getAddress(): string {
    return `${this.name} is visiting ${this.address}`;
  }
}

const person = new Employ(1, "Riyad", "Mirpur 2");

console.log(person.getAddress());

const manager = new Manager(2, "Mr. Manager", "Dhaka");
console.log(manager.getAddress());


class Student {
  fullName: string;
  constructor(firstName: string, lastName: string) {
    this.fullName = `${firstName} ${lastName}`
  }
}

interface Person {
  firstName: string;
  lastName: string
}

function greeter(person: Person): string {
  return `Hello, ${person.firstName} ${person.lastName}`
}

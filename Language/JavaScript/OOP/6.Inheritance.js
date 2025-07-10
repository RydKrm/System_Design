/*
 *
 * Inheritance in JavaScript refers to the mechanism by which objects can inherit properties *
 * and  methods from other objects, allowing for code reuse and creating a hierarchy of object
 * types. This is typically achieved through prototype-based inheritance.
 */

// Parent class
class Animal {
  constructor(name) {
    this.name = name;
  }

  // Method shared by all animals
  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

// Child class inheriting from Animal
class Dog extends Animal {
  constructor(name, breed) {
    super(name); // Call the parent constructor
    this.breed = breed;
  }

  // Method specific to Dog
  speak() {
    console.log(`${this.name} barks`);
  }
}

// Creating an instance of Dog
const myDog = new Dog("Buddy", "Labrador");

// Using inherited methods
myDog.speak(); // Output: "Buddy barks"

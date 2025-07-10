/*
 * prototypes are a fundamental concept related to object-oriented programming and
 * inheritance. Every JavaScript object has a prototype, which acts as a template or
 *  blueprint for that object. Prototypes allow objects to inherit properties and methods
 * from other objects.
 */
// * In JavaScript, objects created using object literals actually do have prototypes
// * The prototype relations of JavaScript objects form a tree-shaped structure,
// * and at the root of this structure sits Object.prototype

// * the prototype is commonly used to add additional functionality to classes, constructor
// * functions, or objects.

class Person {
  constructor(name, education, job) {
    this.name = name;
    this.education = education;
    this.job = job;
  }

  readOut() {
    console.log(
      `${this.name} is complete his education from ${this.education} and do ${this.job} job`
    );
  }
}

Person.prototype.greet = function () {
  return "Hello, my name is " + this.name;
};

const person1 = new Person("Riyad", "RU", "Backend Developer");
person1.readOut();
console.log(person1.__proto__);
console.log(Object.getPrototypeOf(person1));

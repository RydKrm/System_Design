/*
  * Encapsulation in JavaScript refers to bundling the data (properties) and methods  
  * (functions) that operate on the data into a single unit, often called a class or an 
  * object. It allows us to hide the internal state of an object and only expose the 
  * necessary functionalities, thereby protecting the data from being directly manipulated 
  * from outside the object.

*/

// * Encapsulation using Object Literals
let person = {
  name: "John",
  age: 30,
  greet: function () {
    return (
      "Hello, my name is " + this.name + " and I'm " + this.age + " years old."
    );
  },
};

console.log(person.greet());

// * Using private and public property
function Person(name, age) {
  let _name = name; // Private property
  let _age = age; // Private property

  // Public methods to access private properties
  this.getName = function () {
    return _name;
  };

  this.getAge = function () {
    return _age;
  };

  // Public methods to modify private properties
  this.setName = function (name) {
    _name = name;
  };

  this.setAge = function (age) {
    _age = age;
  };
}

let person1 = new Person("John", 30);
console.log(person1.getName()); // Output: John
console.log(person1.getAge()); // Output: 30

person1.setName("Alice");
person1.setAge(25);
console.log(person1.getName()); // Output: Alice
console.log(person1.getAge()); // Output: 25

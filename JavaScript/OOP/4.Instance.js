/* 
 * 
* An instance of an object, often referred to simply as an instance, is a specific 
* realization of that object created using a constructor function or a class.

* In object-oriented programming, classes or constructor functions serve as blueprints for 
* creating objects. When you create an object using a class or constructor function, you're 
* creating an instance of that class or constructor function.

*/

class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}

// Creating an instance of the Person class
const person2 = new Person("Alice", 25);

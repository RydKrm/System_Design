/* 
  * polymorphism refers to the ability of objects to be treated as instances of their parent 
*  class or interface, allowing methods to be invoked on them even if they belong to  
* different concrete implementations. This enables flexibility and code reusability by  
* allowing different objects to be used interchangeably in code that expects a common interface.

* Polymorphism in JavaScript is primarily achieved through prototype-based inheritance and 
* duck typing. Objects can share behavior through their prototype chain, and methods can be 
* invoked on objects regardless of their specific type as long as they implement the expected interface.

*/

// Parent class
function Shape() {}

// Method shared by all shapes
Shape.prototype.draw = function () {
  console.log("Drawing a shape");
};

// Child class inheriting from Shape
function Circle() {}
Circle.prototype = Object.create(Shape.prototype);

// Method specific to Circle
Circle.prototype.draw = function () {
  console.log("Drawing a circle");
};

// Child class inheriting from Shape
function Square() {}
Square.prototype = Object.create(Shape.prototype);

// Method specific to Square
Square.prototype.draw = function () {
  console.log("Drawing a square");
};

// Function that accepts any Shape and invokes its draw method
function drawShape(shape) {
  shape.draw();
}

// Creating instances of Circle and Square
var circle = new Circle();
var square = new Square();

// Invoking the drawShape function with different shapes
drawShape(circle); // Output: "Drawing a circle"
drawShape(square); // Output: "Drawing a square"

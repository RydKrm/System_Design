//   ! Class

//*  JavaScript class is the template for creating object
// * class always have a method called constructor() which is automatically called when a new object is created

class Car {
  // * constructor define the object value
  constructor(name, year) {
    this.name = name;
    this.year = year;
  }
  // * method can access the class properties
  age() {
    const date = new Date().getFullYear();
    return date - this.year;
  }
}
// * class can inheritance other class
class Model extends Car {
  constructor(color, speed, name, year) {
    // *  paranet class can be access by using super() key word
    super(name, year);
    this.color = color;
    this.speed = speed;
  }
  now() {
    console.log(
      `My ${this.color} ${this.name} is ${this.age()} old but still give ${
        this.speed
      } speed per hour`
    );
  }
}

// * create an object with Car class
let newCar = new Car("BMW", 2010);
console.log(newCar.name, newCar.age());

// *create an object with Model class
let newModel = new Model("blue", 200, "BMW", 2015);

// * call the function inside the class
newModel.now();

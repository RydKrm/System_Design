/*
 * a class is a type of function that defines a blueprint for creating objects. It's a
 * syntactical sugar over JavaScript's existing prototype-based inheritance. Classes allow you
 * to create objects with properties and methods
 */

class Car {
  constructor(make, model, year, color, fuelCapacity, fuelLevel) {
    this.make = make;
    this.model = model;
    this.year = year;
    this.color = color;
    this.speed = 0;
    this.engineOn = false;
    this.fuelCapacity = fuelCapacity;
    this.fuelLevel = fuelLevel;
  }

  startEngine() {
    if (!this.engineOn) {
      console.log("Starting the engine...");
      this.engineOn = true;
    } else {
      console.log("Engine is already running.");
    }
  }

  stopEngine() {
    if (this.engineOn) {
      console.log("Stopping the engine...");
      this.engineOn = false;
    } else {
      console.log("Engine is already off.");
    }
  }

  accelerate(speedIncrement) {
    if (this.engineOn) {
      this.speed += speedIncrement;
      console.log(`Accelerating. Current speed: ${this.speed} mph.`);
    } else {
      console.log("Cannot accelerate. Engine is off.");
    }
  }

  brake() {
    if (this.speed > 0) {
      console.log("Applying brakes...");
      this.speed = 0;
    } else {
      console.log("Car is already stopped.");
    }
  }

  getInfo() {
    return `Car: ${this.year} ${this.make} ${this.model}, Color: ${this.color}, Speed: ${this.speed} mph, Fuel Level: ${this.fuelLevel}/${this.fuelCapacity}`;
  }

  checkFuelLevel() {
    console.log(`Current fuel level: ${this.fuelLevel}/${this.fuelCapacity}`);
  }

  refuel(amount) {
    if (this.fuelLevel + amount <= this.fuelCapacity) {
      this.fuelLevel += amount;
      console.log(
        `Refueled ${amount} gallons. Current fuel level: ${this.fuelLevel}/${this.fuelCapacity}`
      );
    } else {
      console.log("Cannot refuel. Fuel tank is full.");
    }
  }

  calculateFuelConsumption(distance) {
    const fuelConsumptionRate = 0.1; // gallons per mile
    const fuelConsumed = fuelConsumptionRate * distance;
    console.log(`Fuel consumed for ${distance} miles: ${fuelConsumed} gallons`);
  }
}

// Create an instance of the Car class
const myCar = new Car("Toyota", "Camry", 2020, "red", 15, 10);

// Use the functionality of the Car class
console.log(myCar.getInfo());
myCar.startEngine();
myCar.accelerate(30);
myCar.brake();
myCar.checkFuelLevel();
myCar.refuel(5);
myCar.calculateFuelConsumption(50);

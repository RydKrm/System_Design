package main

import "fmt"

type Car struct {
	name          string
	model         string
	year          int
	color         string
	mileage       int
	currentSpeed  int
	topSpeed      int
	enginOn       bool
}

func (c *Car) FullDetails() {
	fmt.Printf("Car Name: %s\n", c.name)
    fmt.Printf("Model: %s\n", c.model)
    fmt.Printf("Year: %d\n", c.year)
    fmt.Printf("Color: %s\n", c.color)
    fmt.Printf("Mileage: %d km\n", c.mileage)
    fmt.Printf("Current Speed: %d km/h\n", c.currentSpeed)
    fmt.Printf("Top Speed: %d km/h\n", c.topSpeed)
    fmt.Printf("Engine On: %v\n", c.enginOn)
}

func (c *Car) StartEngine() {
	if !c.enginOn {
		fmt.Println("Engine starting....")
		c.enginOn = true 
	} else {
		fmt.Println("Engine is already running")
	}
}

func (c *Car) StopEngine() {
	if c.enginOn {
        fmt.Println("Engine stopping....")
        c.enginOn = false
    } else {
        fmt.Println("Engine is already stopped")
    }
}

func (c *Car) Accelerate(speedIncrease int){
	if c.enginOn &&  c.currentSpeed + speedIncrease <= c.topSpeed {
		c.currentSpeed += speedIncrease
        fmt.Printf("Accelerating to %d km/h\n", c.currentSpeed)
	}
}




func main(){
	newCar := Car{
	name:          "Tesla",
    model:         "Model S",
    year:          2021,
    color:         "Black",
    mileage:       0,
    currentSpeed:  0,
    topSpeed:      250,
    enginOn:       false,
}

newCar.FullDetails()
newCar.StartEngine()
newCar.Accelerate(100)

}
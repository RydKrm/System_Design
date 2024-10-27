package main

import "fmt"

type Animal interface {
	Speak() string
	Age() int
}

type Dog struct {
	name string
	age  int
}

type Cat struct {
	name string
	age  int
}

func (d Dog) Speak() string {
	return "Woof!"
}

func (d Dog) Age() int {
	return d.age
}



func (c Cat) Speak() string {
	return "Meow!"
}

func (c Cat) Age() int {
	return c.age
}

func PrintAnimalInfo(animal Animal) {
	fmt.Printf(" Age: %d, Speaks: %s\n", animal.Age(), animal.Speak())
}

func main() {
    dog := Dog{name: "Max", age: 3}
    cat := Cat{name: "Whiskers", age: 5}
	PrintAnimalInfo(dog)
	PrintAnimalInfo(cat)
}
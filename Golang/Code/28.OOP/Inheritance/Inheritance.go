package main

import "fmt"

type Animal struct {
	name  string
	age   int
	
}

func (a *Animal) Speak() {
	fmt.Printf("Name :- %s \n Age :- %d \n", a.name, a.age)
}

// Here Dog struct inheritance the Animal
    // Dog struct has a new field sound and barkVolume which are unique to Dog struct.
    // And Dog struct has a new method soundLike() which calls the Speak() method of Animal struct.
    // This is an example of composition in Go.     // Composition allows us to build new types by combining existing ones.     // Here, Dog struct is composed of Animal struct.
    // Dog struct has access to all the fields and methods of Animal struct.
    // It's a powerful feature in Go.
    // However, composition can lead to tighter coupling if the relationship between structs is too tight.
type Dog struct {
    Animal
	sound string
    barkVolume int
}

func (d *Dog) soundLike() {
	d.Speak()
    fmt.Printf("%s barks loudly, volume %d\n", d.name, d.barkVolume)
}

func main() {
    myDog := Dog{Animal{"Buddy", 2}, "Woof", 10}
    myDog.soundLike()
}
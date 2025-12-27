package main

import "fmt"

// Parameter vs Arguments

func add(a int, b int) { // parameter
	sum := a + b
	fmt.Println(sum)
}

func main2() {
	add(5, 7) // argument
}

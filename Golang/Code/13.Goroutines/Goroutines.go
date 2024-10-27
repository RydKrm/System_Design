package main

import (
	"fmt"
	"time"
)

// Goroutines is multi threading calls.

// This function will print in every 250 ms
func printNumbers() {
	for i := 1; i <= 100000000; i++ {
		// fmt.Printf("Number: %d\n", i)
		// time.Sleep(250 * time.Millisecond)
	}
	fmt.Printf("number\n")
}

// This function calls every 400 millisecond
func printLetters() {
	for ch := 1; ch <= 1000000; ch++ {
		// fmt.Printf("Letter: %c\n", ch)
		// time.Sleep(250 * time.Millisecond)
	}
	fmt.Println("\nletter")
}

func testPrint(){
	fmt.Println("This is a test")
}

func main() {
	// Next two function calls go goroutines. That's make a concurrent calls on other thread  
	// Now make the main function stop for 500ms . In that time previous function run and print 
	time.Sleep(500 * time.Millisecond) // Give goroutines time to finish       
	fmt.Println("\nMain function ends")
}

// A buffered channel in Golang allows sending multiple values without an immediate receiver. Unlike unbuffered 
// channels, a buffered channel has a capacity, meaning it can hold multiple values before blocking

package main

import (
	"fmt"
)

func main() {
	ch := make(chan string, 2) // Buffered channel with capacity 2

	ch <- "Hello"
	fmt.Println("Sent: Hello")

	ch <- "Golang"
	fmt.Println("Sent: Golang")

	// ch <- "World" // ❌ This would block because the buffer is full

	fmt.Println("Received:", <-ch)
	fmt.Println("Received:", <-ch)

	// Now there's space, we can send another message
	ch <- "World"
	fmt.Println("Sent: World")
	fmt.Println("Received:", <-ch)

	// Test code
	go test();

}

func test() {
	ch := make(chan int, 3) // Buffered channel with capacity 3

	ch <- 1
	ch <- 2
	ch <- 3

	fmt.Println(<-ch) // No blocking, buffer has data
	fmt.Println(<-ch)
	fmt.Println(<-ch)

	// If we try to receive again, it will block since the buffer is empty
}
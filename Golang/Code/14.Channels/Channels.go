package main

import (
	"fmt"
	"time"
)

// Channels are the pipes that connect concurrent goroutines. You can send values into channels from one
// goroutine and receive those values into another goroutine.

// func passMessage( messages chan string) {
//     messages <- "hello from channel"
// }

// This will sent a message
func firstGoroutine(ch1 chan <- string){
	println("Sending message from first goroutine")
	ch1 <- "Hello from first go Routins"
	close(ch1)
	time.Sleep(time.Second * 1)
}

// This will receive a message
func secondGoroutine(ch1 <-chan string){
	msg := <- ch1;
	fmt.Println("Receiving message from second message ", msg);
	time.Sleep(time.Second * 2)
}

// Buffer Channel

func bufferChannel(){
	messages := make(chan string,2)

	messages <- "First message"
	messages <- "Second message"

	fmt.Println(<- messages)
	fmt.Println(<-messages)
}


func main() {
    fmt.Println("Channels with go")

    // Create a channel
    messages := make(chan string,2)

	messages <- "Hello"

    // Start a goroutine to pass a message
    // go passMessage(messages)

    // Receive the message from the channel
    // msg := <-messages

    // fmt.Println("Received message:", msg);

	// go bufferChannel()

	// Make two channel in two different function and pass message from one function to another

	go firstGoroutine(messages)
	go secondGoroutine(messages)

	time.Sleep(time.Second*3)


}

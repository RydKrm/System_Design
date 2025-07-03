package main

import (
	"fmt"
	"time"
)

// Channels are the pipes that connect concurrent goroutines. You can send values into channels from one
// goroutine and receive those values into another goroutine.

func passMessage(text string, messages chan string) {
    messages <- text
}

func firstGoroutine(ch1 chan <- string, message string){
	println("First go Routines send message")
	ch1 <- message
	// After this line the go routine will be stop, not will be started until other received channel 
	// will not receive the data
// func passMessage( messages chan string) {
//     messages <- "hello from channel"
// }

}

// This will receive a message
func secondGoroutine(ch1 <-chan string){
	msg := <- ch1;
	fmt.Println("Receiving message from second message ", msg);
	time.Sleep(time.Second * 2)
}

// Buffer Channel
// In Golang, an unbuffered channel is a type of channel that has no capacity to store values. It forces the 
// sender to wait until a receiver is ready to receive the value. This makes unbuffered channels a great tool for 
// synchronization between goroutines.

// Why dead lock occur in g routines?
// When a unbuffer sent a data through channel, but no on receive that data, that can create a dead lock 
// so sending data on a unbuffer channel must need a receiver

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

	// go firstGoroutine(messages)
	go secondGoroutine(messages)

	time.Sleep(time.Second*3)


}

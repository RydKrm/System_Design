package main

import (
	"fmt"
)

// Channels are the pipes that connect concurrent goroutines. You can send values into channels from one
// goroutine and receive those values into another goroutine.

func passMessage(text string, messages chan string) {
    messages <- text
}

func firstGoroutine(ch1 chan <- string, message string){
	println("First goRoutins send message")
	ch1 <- message
}

func secondGoroutine(ch1 <-chan string){
	msg := <- ch1;
	fmt.Println("second function receive message ", msg);
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
    messages := make(chan string)

    // Start a goroutine to pass a message
    go passMessage("hello", messages)

    // Receive the message from the channel
    msg := <-messages

    fmt.Println("Received message:", msg);

	go bufferChannel()


	// Make two channel in two different function and pass message from one function to another 

	go firstGoroutine(messages, "hello from channel 1")
	go secondGoroutine(messages)
	
}

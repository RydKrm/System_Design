// closing channels is a mechanism to indicate that no more values will be sent on a channel. This is useful
// to notify receivers that they can stop waiting for more data.

package main

import (
	"fmt"
)

func main() {
	// Create a channel
	ch := make(chan int)

	// Start a goroutine to send data
	go func() {
		for i := 0; i < 5; i++ {
			ch <- i
		}
		// Close the channel after sending all data
		close(ch)
	}()

	// Receive data from the channel
	// goroutine receives data from the channel using a for loop with range ch. The loop automatically stops  
	// when the channel is closed and all data has been received.
	for val := range ch {
		fmt.Println(val)
	}
}

	// Output:
	// 0
	// 1
	// 2
	// 3
	// 4

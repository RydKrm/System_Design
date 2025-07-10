// Timers are for when you want to do something once in the future - tickers are for when you want to do
// something repeatedly at regular intervals

package main

import (
	"fmt"
	"time"
)

func main() {
	// Create a ticker that ticks every second
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop() // Ensure ticker is stopped when done

	done := make(chan bool)

	// Start a goroutine that runs for 5 ticks and then stops the ticker
	go func() {
		for i := 0; i < 5; i++ {
			// This line will stop the execution for 1 second in every iteration 
			<-ticker.C
			fmt.Println("Tick at", time.Now())
		}
		done <- true
	}()

	// Wait for the goroutine to finish
	<-done
	fmt.Println("Ticker stopped")
}

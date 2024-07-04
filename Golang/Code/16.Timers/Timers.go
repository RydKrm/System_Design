package main

import (
	"fmt"
	"time"
)

// We often want to execute Go code at some point in the future, or repeatedly at some interval. Go’s built-in
// timer and ticker features make both of these tasks easy.

func main() {
    // create a timer
	timer := time.NewTimer(3*time.Second); 
	fmt.Println("Timer before fired")

	fmt.Println("Timer will make wait to expire ")
    // this line will block the execution until timer is fired 
	<- timer.C
    // After that it will run again 
	fmt.Println("Timer fired")
    timer.Stop()
	// One reason a timer may be useful is that you can cancel the timer before it fires. Here’s an example of that.

	// create a another timer
	timer2 := time.NewTimer(time.Second)

	  go func() {
        <-timer2.C
        fmt.Println("Timer 2 fired")
    }()
    stop2 := timer2.Stop()
    if stop2 {
        fmt.Println("Timer 2 stopped")
    }

}
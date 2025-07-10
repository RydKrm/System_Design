// Send message in channel with select clause is basically blocking the channel. Untill one of them did not give result it will be block the execution time .
// For doing non blocking IO need to use default clause
package main

import (
	"fmt"
	"time"
)

func firstChannel(channel chan<- string,text string)(chan <- string){
    time.Sleep(10000 * time.Millisecond)
	channel <- text;
    fmt.Println("First channel ")

	return channel
}

func secondChannel(channel chan<- string, text string) (chan <- string) {
	time.Sleep(15000 *time.Millisecond)
    channel <- text;
	
	fmt.Println("Second channel ")
	return channel
}

func main(){
	fmt.Println("Select key in go");

	channel1 := make(chan string, 2)
	channel2 := make(chan string,2)
	go firstChannel(channel1, "1st")
	go secondChannel(channel2,"2nd")

	// select working like from the bellow two channel which channel will return fast 
	// But We use a default cluase to so fist and second  case take time to run execution , in default time 
	// print the default case

   select{
   case first := <- channel1 :
	   fmt.Println("message from first ", first);
   case second := <- channel2 :
	   fmt.Println("message form second", second);
   default:
	  fmt.Println("Non blocking default case is printing ")	   
   }

}
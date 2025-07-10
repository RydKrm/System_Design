package main

import (
	"fmt"
	"time"
)

// Go’s select lets you wait on multiple channel operations. Combining goroutines and channels with select is a /
// powerful feature of Go.
// the select statement is used to wait on multiple communication operations on channels. It allows you to
// choose  which of several possible communication operations will proceed. This makes it a powerful tool for
// concurrent programming, especially when dealing with multiple channels and goroutines.


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
	// 

   select{
   case first := <- channel1 :
	   fmt.Println("message from first ", first);
   case second := <- channel2 :
	   fmt.Println("message form second", second)
   }

}
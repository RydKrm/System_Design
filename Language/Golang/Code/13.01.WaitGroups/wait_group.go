/**
 The problem with go routines is that main function need to sleep() for a spec amount of time to complete the other function.
 But in here we use waitGroup() which is start with a wg.Add() function which tells that how many go routines need to complete
 before the main function go to execute. 
 It takes a counter with value which was given in wg.Add() function. Then when wg.Done() function called the counter 
 value also decrease. 
 When the counter value is goes to 0 then the main function execute.
*/

package main

import (
	"fmt"
	"sync"
)

func calculatePrint(num int, wg *sync.WaitGroup){
	for i:=1;i<1000;i++ {
	}
	fmt.Println(num);
	wg.Done();
}

func main(){
	fmt.Println("Testing Wait Goroutine");
	var wg sync.WaitGroup;
	wg.Add(10);
	for i:=0; i<10; i++ {
		go calculatePrint(i, &wg);
	}
	wg.Wait();
}
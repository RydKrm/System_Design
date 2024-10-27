package main

import (
	"fmt"
)

func main(){

	// declaring variable 
	var first int = 64
	first = 32

	// declaring variable with type inferred

	second := 64

	// variable declaring with type
	var third = 128

	fmt.Println("hello world!", first + second + third)

	var student1 string
	sum := first + second +third
    student1 = "John"
    fmt.Println(student1, sum)

	// declaring multiple value in the same line 
	var a,b,c,d float32 = 23,4,6,12
	fmt.Println( (a + b + c + d)/4)

	// if the `type` of variable not define then you  can define multiple type in same variable 
	var six, hello = 6, "hello"

	fmt.Println(hello, six)

	// Multiple variable declarations can also be grouped together into a block for greater readability

	var (
		empty int
		withOne int = 1
		helloString string = "hello"
	  )

	fmt.Println(empty, withOne, helloString)  

	// * Declare constants 

	const PI = 3.1416
	fmt.Println("value of pi", PI)


}

// Their are different type of variables 
// int 
// float32 
// string
// bool 
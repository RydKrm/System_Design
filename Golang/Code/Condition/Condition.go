package main

import (
	"fmt"
)

func main(){
	fmt.Println("Condition statement ")

	a,b := 5,6

	if a>b {
		fmt.Println("a is greater then b")
	} else {
		 fmt.Println("b is greater then a ")
	}

	time := 22
	if time < 10 {
	  fmt.Println("Good morning.")
	} else if time < 20 {
	  fmt.Println("Good day.")
	} else {
	  fmt.Println("Good evening.")
	}


	day := 5

	switch day {
	case 1:
	  fmt.Println("Monday")
	case 2:
	  fmt.Println("Tuesday")
	case 3:
	  fmt.Println("Wednesday")
	case 4:
	  fmt.Println("Thursday")
	case 5:
	  fmt.Println("Friday")
	case 6:
	  fmt.Println("Saturday")
	case 7:
	  fmt.Println("Sunday")
	default:
	  fmt.Println("Not a weekday")
	}

	// Multi case functions

	switch day {
	case 1,3,5:
	 fmt.Println("Odd weekday")
	case 2,4:
	  fmt.Println("Even weekday")
	case 6,7:
	 fmt.Println("Weekend")
   default:
	 fmt.Println("Invalid day of day number")
   }


}
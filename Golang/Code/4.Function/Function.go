package main

import (
	"fmt"
)

// simple functions
func myFunction(x int, y int) int {
  return x + y
}

// Name return functions
func myNamedFunction(x int, y int) (result int) {
	result = x + y
	return
  }

//   Function with multioke return 
func myMultiReturnFunction(x int, y string) (result int, txt1 string) {
	result = x + x
	txt1 = y + " World!"
	return
  }

//   Recursion function 
func testcount(x int) int {
	if x == 11 {
	  return 0
	}
	fmt.Println(x)
	return testcount(x + 1)
  }

func main() {
  fmt.Println(myFunction(1, 2))
  fmt.Println(myNamedFunction(14,65))
  num , txt := myMultiReturnFunction(22,"multi")
  fmt.Println("Multi return output ", num, txt)
  testcount(0)
}
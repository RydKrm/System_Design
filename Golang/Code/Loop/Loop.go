package main

import (
	"fmt"
)

func main() {
  for i:=0; i < 5; i++ {
    fmt.Print(" ",i)
  }

  fruits := [3]string{"apple", "orange", "banana"}
  for idx, val := range fruits {
     fmt.Printf("%v\t%v\n", idx, val)
  }

//   omit the other field with undersacore 

for _, val := range fruits {
	fmt.Printf("%v\n", val)
 }

// omit the index with underscore
for idx, _ := range fruits {
	fmt.Printf("%v\n", idx)
 }

}
// Arrays are used to store multiple values of the same type in a single variable, instead of declaring separate variables for each value

package main

import (
	"fmt"
)

func main(){
	fmt.Println("Starting array");

	// Fixed sized array 

	arr1 := []int{1, 2}
	arr2 := [4]int{1,2,3,4}
	fmt.Println(arr1, arr2)

	// define array with length inferred

	var arr3 = [...]int{43,1,9,13,3,54,12}

	fmt.Println("Inferred array ", arr3)

    // declare array with initialized variable 
	emptyArray := [5]int{} //not initialized
    partiallyFull := [5]int{1,2} //partially initialized
    fullArray := [5]int{1,2,3,4,5} 

	fmt.Println(emptyArray, partiallyFull, fullArray)

	// find the length of array 
	length := len(emptyArray)
	fmt.Println("Length of array ", length)

	b := [...]int{100, 3: 400, 500}
    fmt.Println("idx:", b)


	// Array types are one-dimensional,
	var twoD [2][3]int
    for i := 0; i < 2; i++ {
        for j := 0; j < 3; j++ {
            twoD[i][j] = i + j
        }
    }
    fmt.Println("2d: ", twoD)

	// Take a 100 sized array with initial values are 100
	initial_value_array := [100]int{0}
	for i:=0; i<100; i++ {
        fmt.Printf("%v ", initial_value_array[i])
    }

}
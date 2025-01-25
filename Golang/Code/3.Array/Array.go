// Arrays are used to store multiple values of the same type in a single variable, instead of declaring separate variables for each value

package main

import (
	"fmt"
)

func main(){
	fmt.Println("Starting array");

	// Fixed sized array 

	var arr1 = [3]int{1,2,3}
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

}
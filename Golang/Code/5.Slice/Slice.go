package main

import "fmt"

// Their are many way to create variable
// Using the []datatype{values} format
// Create a slice from an array
// Using the make() function

func main(){
	fmt.Println("Array Slice Create Here")
    // common way to create slice
	firstSlice := []int{2,4,1,6}
    
	// create slice from array
	arr1 := [6]int{1,2,3,4,5,6,}
	fromArrayToSlice := arr1[2:4]

	// create slice using make()
	makeSlice := make([]int, 5,10)

	fmt.Println(firstSlice, fromArrayToSlice, makeSlice)

	// append element in the slice
	fromArrayToSlice = append(fromArrayToSlice, 123,4)
	fmt.Println("added element to slice ", fromArrayToSlice)

	// append two slice together
	firstSlice = append(firstSlice, fromArrayToSlice...)

	fmt.Println(firstSlice)

	// find the capacity and length of slice 
	fmt.Println("capacity  ", cap(firstSlice), "Length => ", len(firstSlice))


	numbers := []int{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15}
	neededNumbers := numbers[:len(numbers)-10]
	numbersCopy := make([]int, len(neededNumbers))
	copy(numbersCopy, neededNumbers)

	// how does the slice works
	trySlice := []int{};
	trySlice = append(trySlice, 12)
	trySlice = append(trySlice, 12)
	trySlice = append(trySlice, 13,123)
    
	// make slice with initial size and position
	try_make_slice := make([]int,2)
	
	fmt.Println(cap(try_make_slice))

	try_make_slice = append(try_make_slice, trySlice...);

	fmt.Println(try_make_slice)

}
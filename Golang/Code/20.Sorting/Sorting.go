package main

import (
	"cmp"
	"fmt"
	"slices"
)

func main() {

    strs := []string{"c", "a", "b"}
    slices.Sort(strs)
    fmt.Println("Strings:", strs);

    ints := []int{7, 2, 4}
    slices.Sort(ints)
    fmt.Println("Ints:   ", ints)

    s := slices.IsSorted(ints)
    fmt.Println("Sorted: ", s)

	// Sorting with another value 

	type Person struct{
		name string;
		age int;
	}

	 people := []Person{
        {name: "James", age: 37},
        {name: "ABS", age: 25},
        {name: "Alex", age: 72},
    }

	slices.SortFunc(people,
        func(a, b Person) int {
            return cmp.Compare(a.age, b.age)
        })
    fmt.Println(people)

}
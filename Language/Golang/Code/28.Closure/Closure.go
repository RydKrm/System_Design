package main

import "fmt"

func outer() func() int {
	i := 0

	return func() int {
		i++
		return i
	}

}

func main() {
	out := outer()

	fmt.Println(out())

	fmt.Println(out())
	fmt.Println(out())
}

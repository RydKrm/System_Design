package main

import (
	"errors"
	"fmt"
)

func division(first int, second int) (int, error) {
	if second == 0 {
		return -1, errors.New("cannot divide with zero")
	}

	return first/second, nil
}

func main(){
	div, err := division(12,0);
    if err == nil {
		fmt.Println("Answer ", div);
	} else {
	    fmt.Println(err)
	}
	
}
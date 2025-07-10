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

func totalNumber(nums ...int) (int, error) {
	if len(nums) == 0 {
        return 0, errors.New("no numbers provided")
    }

    total := 0
    for _, num := range nums {
        total += num
    }

    return total, nil
}

func main(){
	div, err := division(12,0);
    if err == nil {
		fmt.Println("Answer ", div);
	} else {
	    fmt.Println(err)
	}
	
	total, err := totalNumber(1, 2, 3, 4, 5);
	if err == nil {
        fmt.Println("Total ", total);
    } else {
        fmt.Println(err)
    }

}
// A struct (short for structure) is used to create a collection of members of different data types, into a single variable.

// While arrays are used to store multiple values of the same data type into a single variable, structs are used to store multiple values of different data types into a single variable.

// A struct can be useful for grouping data together to create records.

package main

import "fmt"

type Person struct {
	name string
	age int
	job string
	salary int
	savingAmount []float64
  }
// struct can hold method with in 

func (p Person) checkerJobEligible() bool {
	if p.age<=30 {
		return true
	} else {
		return false
	}
}


func (p Person) AddMoneyToSavingAccount( amount int){
	p.savingAmount = append(p.savingAmount, float64(amount))
    fmt.Println("Money added to the account, new total is ", p.savingAmount)
  }

func (p Person) GetTotalMoney() float64{
    return float64(sum(p.savingAmount))
}

func sum(values []float64) int {
    total := 0
    for _, value := range values {
        total += int(value)
    }
    return total
}

  func main(){
	var person1 Person;

	person1.name = "Riyadh"
	person1.age  = 32
	person1.job = "Web developer"
	person1.salary = 100

	println("Name : ",person1.name)
	println("Age : ", person1.age)
	println("Job : ", person1.job)
	println("Salary : ", person1.salary)
	println("Job checker ", person1.checkerJobEligible())

  }
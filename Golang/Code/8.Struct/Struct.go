// A struct (short for structure) is used to create a collection of members of different data types, into a single variable.

// While arrays are used to store multiple values of the same data type into a single variable, structs are used to store multiple values of different data types into a single variable.

// A struct can be useful for grouping data together to create records.

package main

type Person struct {
	name string
	age int
	job string
	salary int
  }
// struct can hold method with in 

func (p Person) checkerJobEligible() bool {
	if p.age<=30 {
		return true
	} else {
		return false
	}
	
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
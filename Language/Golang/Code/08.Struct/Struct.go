// A struct (short for structure) is used to create a collection of members of different data types, into a single variable.

// While arrays are used to store multiple values of the same data type into a single variable, structs are used to store multiple values of different data types into a single variable.

// A struct can be useful for grouping data together to create records.

package main

type Person struct {
	name string
	age int
	job string
	salary [10]int
}

// struct can hold method with in 
func (p Person) checkerJobEligible() bool {
	if p.age<=30 {
		return true
	} else {
		return false
	}
}

func (p Person) totalSalary() int {
	sum := 0
    for _, salary := range p.salary {
        sum += salary
    }
    return sum
}


func main(){
	var person1 Person;

	person1.name = "Riyadh"
	person1.age  = 32
	person1.job = "Web developer"
	person1.salary[0] = 123

	println("Name : ",person1.name)
	println("Age : ", person1.age)
	println("Job : ", person1.job)
	// println("Salary : ", person1.salary)
	println("Job checker ", person1.checkerJobEligible())
	println("Total salary : ", person1.totalSalary())
}
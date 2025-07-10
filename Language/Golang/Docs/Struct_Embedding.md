## Embedding Structure 

Embedding a struct within another struct is a way to achieve composition and reuse code. When a struct is 
embedded within another struct, the fields and methods of the embedded struct are promoted to the 
containing struct, allowing you to access them directly from the containing struct.

Suppose you have two structs: Person and Employee. You want to embed Person within Employee to reuse its fields.

```go 
type Person struct{
    name string
    age int
}
```

Now embedding with another type 
```go 
 type Employee struct{
    Person
    jobTitle string
    salary int
 }

```
Creating a Embedding structure 

```go 
  
  emp:= Employee{
    Person : Person{
        name: "Riyad",
        age : 30
    }
    jobTitle : "Software Engineer",
    salary: 10000
  }

```

 Access fields of both `Employee` and embedded `Person`

```go
fmt.Println("Person => ", emp.name, emp.age, emp.jobTitle, emp.salary)  
```

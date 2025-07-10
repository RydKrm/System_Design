## Interfaces 

Interfaces are named collections of method signatures.

First create a `struct`

```go 
type Developer struct {
	name string
	age int 
	job string
	competitiveProgrammer bool
	exp int 
	language string

}

```
Then create an Interface which contain the method list with their signatures 

```go
type DeveloperInterface interface{
	ageOk() bool
	isDeveloper()bool
	isExperenced() bool 
	whatLanguage() string
}

```

Create methods on the struct which in the interfaces.  

```go
func (d Developer) ageOk(expAge int) bool{
   if d.age>= expAge {
	return true
   } else {
	return false
   }
}

func (d Developer) isDeveloper(currentJob string) bool{
	if currentJob == d.job {
		return true 
	} else {
		return false
	}
}

func (d Developer) isExperenced(currentJobExp int) bool {
	if currentJobExp>= d.exp {
		return true 
	} else {
		return false
	}
}

func (d Developer) whatLanguage() string{
	return d.language
}
```

`main()` function create the variable and call the developer `interface` methods

```go

func main(){

	developer1 := Developer { 
		name: "Riyadh",
	    job: "backendDeveloper",
	    age: 26, 
		competitiveProgrammer: true,
		exp:1,
		language: "go",
	 }

	if developer1.ageOk(30) {
		fmt.Println("Developer age okay")
	} 

	if developer1.isDeveloper("backendDeveloper") {
		fmt.Println("this is a developer ")
	}

	if developer1.isExperenced(2){
		fmt.Println("Developer has exprence ")
	}

    fmt.Println(developer1.whatLanguage())

}


```

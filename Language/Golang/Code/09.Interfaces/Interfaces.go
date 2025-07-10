package interfaces

import "fmt"

type Developer struct {
	name string
	age int
	job string
	competitiveProgrammer bool
	exp int
	language string 
}

type DeveloperInterface interface{
	ageOk(expAge int) bool
	isDeveloper()bool
	isExperenced() bool
	whatLanguage() string
}

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

	Geometry()

}

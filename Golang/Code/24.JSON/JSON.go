package main

import (
	"encoding/json"
	"fmt"
)

// Struct
type course struct{
	Name string `json:"courseName"`
	Price int 
	Platform string `json:"website"`
	Password string `json:"-"`
	Tag []string `json:"tagList,omitempty"`
}

func EncodeJson(){
	firstCourse := []course{
		{"React", 300, "udemy","password123", []string{"web","frontEnd"}},
		{"Node.js", 200, "coursera","password123", []string{"web","backendEnd"}},
		{"Golang", 300, "udemy","password123", []string{"server","backendEnd"}},
		{"Django", 300, "udemy","password123", nil},
	}

	// convert this to json with not indented format 
	// jsonFormat, err := json.Marshal(firstCourse) ;

	// For indentation  
	// first parameter take the data, 
	// second for take prefix word 
	// third for indent way
	jsonFormat,err := json.MarshalIndent(firstCourse,"","\t")

	if err!= nil {
		panic(err)
	}

	fmt.Printf("%s \n", jsonFormat)

}

func main(){ 
	fmt.Println("Json for start here")
	EncodeJson()
}
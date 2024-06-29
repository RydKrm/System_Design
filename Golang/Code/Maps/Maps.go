// Maps are used to store data values in key:value pairs.

// Each element in a map is a key:value pair.

// A map is an unordered and changeable collection that does not allow duplicates.

// The length of a map is the number of its elements. You can find it using the len() function.

// The default value of a map is nil.

// Maps hold references to an underlying hash table

package main

import (
	"fmt"
)

func main() {
  var firstMap = map[string]string{"brand": "Ford", "model": "Mustang", "year": "1964"}
   secondMap := map[string]int{"Oslo": 1, "Bergen": 2, "Trondheim": 3, "Stavanger": 4}

  fmt.Printf("a\t%v\n", firstMap)
  fmt.Printf("b\t%v\n", secondMap)

//   creating map using make()
var makeMap = make(map[string]string) // The map is empty now
makeMap["brand"] = "Ford"
makeMap["model"] = "Mustang"
makeMap["year"] = "1964"
fmt.Printf("a\t%v\n", makeMap)

// Access Map Elements
println("Brand => ", makeMap["brand"])

// Remove Element from Map
delete(makeMap, "model")

// Check For Specific Elements in a Map
brand, isExist := makeMap["brand"]

if isExist  {
	println("The brand of car ", brand)
}

for k, v := range makeMap {
    fmt.Print( k, v)
  }

}
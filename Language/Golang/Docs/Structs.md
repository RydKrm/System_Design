## Struct 

Go’s `structs`are typed collections of fields. They’re useful for grouping data together to form records.
This person `struct` type has name and age fields.

### Create Struct

```go 
type Person struct {
    name string
    age  int
}

person1 := Person(name:"riyadh", age:26)

// If integer type missing then it will intialize with 0
person2 := Person(name:"Riyadh")

```

## Method 

Go supports methods defined on struct types.

create a structure with width and height 

```go
type rect struct {
    width, height int
}

```

Now added a `method` on it 

```go
func (r *rect) area() int {
    return r.width * r.height
}

```

Added anmother method on it

```go
func (r rect) perim() int {
    return 2*r.width + 2*r.height
}

```

Here Create a struct first and then call the methods 

```go
func main() {
    r := rect{width: 10, height: 5}

    fmt.Println("area: ", r.area())
    fmt.Println("perim:", r.perim())

    rp := &r
    fmt.Println("area: ", rp.area())
    fmt.Println("perim:", rp.perim())
}
```





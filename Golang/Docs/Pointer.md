## Pointer 
pointers, allowing you to pass references to values and records within your program.

Function which can initialize the variable 

```go
func zeroval(ival int) {
    ival = 0
}
```

Also a function which can initialize with memory function 
```go
func zeroptr(iptr *int) {
    *iptr = 0
}
```

```go
func main() {
    i := 1
    fmt.Println("initial:", i)
    // this will intialize the variable 

    zeroval(i)
    fmt.Println("zeroval:", i)

    // this function will also intialize variable with pointer 
    // this will pass the reference of the variable and it will initialize with value 
    zeroptr(&i)
    fmt.Println("zeroptr:", i)

    fmt.Println("pointer:", &i)
}

```
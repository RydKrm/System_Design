## Functions

Basic go functions

```go
func plus(a int, b int) int {

    return a + b
}
```

If the input parameter is same

```go
func plusPlus(a, b, c int) int {
    return a + b + c
}

```

Multi return functions

```go
func vals() (int, int) {
    return 3, 7
}

a, b := vals()

```

#### Variadic Functions
 Variadic functions can be called with any number of trailing arguments. For example, fmt.Println is a common variadic function.

```go
func sum(nums ...int) {
    fmt.Print(nums, " ")
    total := 0

    for _, num := range nums {
        total += num
    }
    fmt.Println(total)
}

sum(1,3)

sum(1,2,3,4)

nums := []int{1, 2, 3, 4}
sum(nums...)


```

## Closer 
A closure, also lexical closure or function closure, is a technique for implementing lexically scoped 
name binding in a language with first-class functions. Operationally, a closure is a record storing a 
function[a] together with an environment

```go 
func intSeq() func() int {
    i := 0
    return func() int {
        i++
        return i
    }
}

```
In this program the `intSeq()` is return a function which also return another function. When function 
return function it create a `closer`. that anonymous function return it's ` i ` variable with it. so when 
we call `intSeq()` multiple time it return `1 increment ` every time 

```go 
nextInt := intSeq()
	
fmt.Println(nextInt())
fmt.Println(nextInt())
fmt.Println(nextInt())
```

## Recursive Functions
Closures can also be recursive, but this requires the closure to be declared with a typed var explicitly 
before it’s defined.

```go 
func fact(n int) int {
    if n == 0 {
        return 1
    }
    return n * fact(n-1)
}
```

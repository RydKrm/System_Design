## Generics 

Generics in Go allow you to write flexible and reusable functions and data structures that can operate on 
any data type.

Create a generic function 
```go

func Swap[T any](first, second T)(T, T){
	return second, first
}
```

Create a generic struct and a stack with generic type

```go
type Stack[T any] struct{
	items []T 
}
```

Added method on the `Stack`

```go
func (s *Stack[T]) Push(item T){
	s.items = append(s.items, item)
}



func (s *Stack[T]) Pop() T {
	if len(s.items) ==0 {
		var zero T
		return zero
	}
	item := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items) - 1]
	return item
}
```


### Constraints functions

Constraints can restrict the types that can be used with a generic function or type.


```go
type Addable interface{
	int | int64 | float64
}

func Add[T Addable] (a,b T) T {
	return a + b
}

```
Main functions

```go
func main(){
	x,y := Swap[int](4,5)

	println("Swap values ",x,y)


	// Create a stack 

	newStack := Stack[int]{}

	newStack.Push(12)
	newStack.Push(25)

	newStack.Push(16)

	newStack.Pop()

	// String stack 

	stringStack := Stack[string]{}

	stringStack.Push("Dhaka")
	stringStack.Push("Rajshahi")
	stringStack.Push("London")

	fmt.Println("String stack before pop ", stringStack)

	stringStack.Pop()

	fmt.Println("string stack after push ", stringStack)

	fmt.Println("Adder function ", Add(2,5))
	fmt.Println("Adder function ", Add(0.12, 314.44))

}

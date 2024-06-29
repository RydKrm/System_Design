## Slice 

Unlike arrays, slices are typed only by the elements they contain (not the number of elements). An uninitialized slice equals to nil and has length 0.

To create an empty slice with non-zero length, use the builtin make.

```go 
s = make([]string, 3)
fmt.Println("emp:", s, "len:", len(s), "cap:", cap(s))
```
One is the builtin append, which returns a slice containing one or more new values. Note that we need to accept a return value from append as we may get a new slice value.


```go 
    s = append(s, "d")
    s = append(s, "e", "f")
    fmt.Println("apd:", s)
```

#### Slice operator in slice 
 
 ```go
 l := s[2:5]
 fmt.Println("sl1:", l)
 l = s[:5]
    fmt.Println("sl2:", l)
  l = s[2:]
    fmt.Println("sl2:", l)  
```
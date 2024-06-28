## Maps 
Maps are Go’s built-in associative data type 

To create an empty map, use the builtin make: make(map[key-type]val-type).

```go
m := make(map[string]int)
```

Insert element into the map 

```go 
m["k1"] = 7
    m["k2"] = 13
```    

Delete keys from map 

```go 
delete(m, k1)
```

Clear a map 

```go 
clear(m)
```

Check a key exists in map or not 

```go
key, isExists = m["k1"]
```

Check two map is equal or not 

```go 
n1 := map[string]int{"foo": 1, "bar": 2}
n2 := map[string]int{"foo": 1, "bar": 2}
    if maps.Equal(n1, n2) {
        fmt.Println("n == n2")
    }

```
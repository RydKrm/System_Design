package main

import (
	"fmt"
	s "strings"
)

var p = fmt.Println 

type point struct {
	x,y int;
}

func main() {
    p("Contains:  ", s.Contains("test", "es"))
    p("Count:     ", s.Count("test", "t"))
    p("HasPrefix: ", s.HasPrefix("test", "te"))
    p("HasSuffix: ", s.HasSuffix("test", "st"))
    p("Index:     ", s.Index("test", "e"))
    p("Join:      ", s.Join([]string{"a", "b"}, "-"))
    p("Repeat:    ", s.Repeat("a", 5))
    p("Replace:   ", s.Replace("foo", "o", "0", -1))
    p("Replace:   ", s.Replace("foo", "o", "0", 1))
    p("Split:     ", s.Split("a-b-c-d-e", "-"))
    p("ToLower:   ", s.ToLower("TEST"))
    p("ToUpper:   ", s.ToUpper("test"))


	// String Formatter 

	p := point{1, 2}
    fmt.Printf("struct1: %v\n", p) // {1,2}

    fmt.Printf("struct2: %+v\n", p) // {x:1 y:2}

    fmt.Printf("struct3: %#v\n", p) // main.point {x:1, y:2}

    fmt.Printf("type: %T\n", p) // main.point 

    fmt.Printf("bool: %t\n", true)  // true 

    fmt.Printf("int: %d\n", 123)  // 123 

    fmt.Printf("bin: %b\n", 14) // for binary print 1110

    fmt.Printf("char: %c\n", 33) // for number to character print "!"

    fmt.Printf("hex: %x\n", 456) // hex print "1c8"

    fmt.Printf("float1: %f\n", 78.9) // float number 78.90000000

    fmt.Printf("float2: %e\n", 123400000.0)  // for scientific print 1.23e+08
    fmt.Printf("float3: %E\n", 123400000.0)  // for scientific print 1.23E+08

    fmt.Printf("str1: %s\n", "\"string\"")   // "string"

    fmt.Printf("str3: %x\n", "hex this")  // hex to print 

    fmt.Printf("pointer: %p\n", &p)  // 0xc0000ba000

    fmt.Printf("width1: |%6d|%6d|\n", 12, 345) // |    12|   345|

    fmt.Printf("width2: |%6.2f|%6.2f|\n", 1.2, 3.45)  // |  1.20|  3.45|

    fmt.Printf("width3: |%-6.2f|%-6.2f|\n", 1.2, 3.45) // |1.20  |3.45  |

    fmt.Printf("width4: |%6s|%6s|\n", "foo", "b") // |   foo|     b|

    fmt.Printf("width5: |%-6s|%-6s|\n", "foo", "b") // width5: |foo   |b 

    s := fmt.Sprintf("sprintf: a %s", "string") // sprintf: a string
    fmt.Println(s)

}




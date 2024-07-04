//  Defer is used to ensure that a function call is performed later in a program’s execution, usually for purposes of cleanup.
// The line with defer will be execute in the end of the function. It could be used where something must be executed in the end of the code.
// Suppose we wanted to create a file, write to it, and then close when we’re done.

package main

import (
	"fmt"
	"os"
)

func main() {

    f := createFile("/tmp/defer.txt")
    defer closeFile(f)
    writeFile(f)
}

func createFile(p string) *os.File {
    fmt.Println("creating")
    f, err := os.Create(p)
    if err != nil {
        panic(err)
    }
    return f
}

func writeFile(f *os.File) {
    fmt.Println("writing")
    fmt.Fprintln(f, "data")

}

func closeFile(f *os.File) {
    fmt.Println("closing")
    err := f.Close()

    if err != nil {
        fmt.Fprintf(os.Stderr, "error: %v\n", err)
        os.Exit(1)
    }
}
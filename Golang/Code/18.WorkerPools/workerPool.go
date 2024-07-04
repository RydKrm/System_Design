// Worker Pools in Go are a common concurrency pattern used to manage and distribute tasks among
// multiple worker goroutines. This pattern helps in efficiently utilizing system resources, such as
// CPU and memory, and in handling a large number of tasks concurrently. Here's a brief explanation of
//how Worker Pools work in Go

package main

import (
	"fmt"
	"sync"
	"time"
)

// Worker function that processes tasks
func worker(id int, tasks <-chan int, wg *sync.WaitGroup) {
    defer wg.Done()
    for task := range tasks {
        fmt.Printf("Worker %d started task %d\n", id, task)
        time.Sleep(time.Second) // Simulate work
        fmt.Printf("Worker %d finished task %d\n", id, task)
    }
}

func main() {
    const numWorkers = 3
    const numTasks = 10

    tasks := make(chan int, numTasks)
    var wg sync.WaitGroup

    // Start workers
    for i := 1; i <= numWorkers; i++ {
        wg.Add(1)
        go worker(i, tasks, &wg)
    }

    // Submit tasks
    for i := 1; i <= numTasks; i++ {
        tasks <- i
    }
    close(tasks)

    // Wait for all workers to finish
    wg.Wait()
    fmt.Println("All tasks completed.")
}

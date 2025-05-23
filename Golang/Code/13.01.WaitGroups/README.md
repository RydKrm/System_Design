#### Key Functions in sync.WaitGroup

`wg.Add(n) ` Adds n number of goroutines to wait for.
`wg.Done() ` Decrements the counter when a goroutine finishes.
`wg.Wait() ` Blocks execution until the counter reaches 0.

#### 🔴 Important Notes

Always pass \*sync.WaitGroup as a pointer (&wg) to avoid copying the struct.
Use defer wg.Done() inside goroutines to ensure Done() is always called, even if the function exits early.
If you forget to call wg.Wait(), the program may exit before goroutines finish execution.

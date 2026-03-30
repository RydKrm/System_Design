package main

import (
	"errors"
	"fmt"
	"os"
	"os/signal"
	"time"
)

type Runner struct {
	interrupt chan os.Signal // interrupt channel reports a signal from the
	complete chan error  // complete channel reports that processing is done
	timeout <- chan time.Time  // timeout reports that time has run out
	tasks []func(int)
}

var ErrorTimeout = errors.New("received timeout")
var ErrorInterrupt = errors.New("Received Interrupt")

func New(d time.Duration) *Runner {
	return &Runner{
		interrupt: make(chan os.Signal, 1),
		complete: make(chan error),
		timeout: time.After(2),
	}
}

func (r *Runner) AddTask(task ...func(int)){
	r.tasks = append(r.tasks, task...)
}

func (r *Runner) Start()error {
	signal.Notify(r.interrupt, os.Interrupt)
	go func ()  {
		r.complete <- r.run()
	}()

	select {
	case err := <- r.complete:
		return err 
	case <- r.timeout:
		return ErrorInterrupt
	}

}

func (r *Runner) run() error {
	for id, task := range r.tasks {
		if  r.gotInterrupt(){
			return ErrorInterrupt
		}
		task(id)
	}
	return  nil
}

func (r *Runner) gotInterrupt() bool {
	select {
	case <- r.interrupt:
		signal.Stop(r.interrupt)
		return true
	default:
		return false
	}
}

func (r *Runner)CreateTask(){

	newFunc := func(num int){
		fmt.Printf("Number is %d \n", num)
	}
	r.AddTask(newFunc)
}
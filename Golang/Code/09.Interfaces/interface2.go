// package main

// import "fmt"

// type IMobile interface {
// 	ring()
// 	processor()
// 	sendSMS(text string)
// }

// type mobile struct {
// 	name  string
// 	model string
// 	ram   uint16
// }

// func (mob mobile) ring() {
// 	fmt.Println(mob.name + "ringing")
// }

// func (mob mobile) sendSMS(text string){
// 	fmt.Println(mob.name + "sending sms " + text)
// }

// func (mob mobile) processor(){
// 	fmt.Println(mob.name + "with model " + mob.model + " is good" );
// }

// func main() {
// 	phone1 := mobile{
// 		name:  "iphone",
// 		model: "13s",
// 		ram:   8,
// 	}

// 	phone1.ring();
// 	phone1.processor();
// 	phone1.sendSMS("my name");

// }
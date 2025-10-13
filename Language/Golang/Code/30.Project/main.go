package project

import (
	"fmt"
	"net/http"
)

func helloHandler(w http.ResponseWriter, r *http.Request){
	fmt.Fprintf(w, "Hello World");
}

func aboutHandler(w http.ResponseWriter, r *http.Request){
	fmt.Fprintf(w, "About Page");
}


func main(){
 mux :=	http.NewServeMux();
 mux.HandleFunc("/hello", helloHandler);

 mux.HandleFunc("/about", aboutHandler);

 fmt.Println("Server is running on port 8080");
 err := http.ListenAndServe(":8080", mux);

 if err != nil{
	fmt.Println(err);
 }

}
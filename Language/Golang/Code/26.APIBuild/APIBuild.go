package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type Course struct{
	CourseId string `json:"courseId"`
	CoursePrice int `json:"coursePrice"`
	CourseName string `json:"courseName"`
	CourseSite string `json:"courseSite"`
    Author *Author `json:"author"`
} 

type Author struct{
	Fullname string `json:"fullName"`
	Website string `json:"website"`
}


var courses []Course

// middleware 
func (c *Course) isEmpty() bool {
	return c.CourseId == ""
}

func main(){
	fmt.Println("API Buildding here") ;
	r := mux.NewRouter()

	courses = append(courses, Course{CourseId: "2", CourseName: "ReactJS", CoursePrice: 299, Author: &Author{Fullname: "Hitesh Choudhary", Website: "lco.dev"}})
	courses = append(courses, Course{CourseId: "4", CourseName: "MERN Stack", CoursePrice: 199, Author: &Author{Fullname: "Hitesh Choudhary", Website: "go.dev"}})

	// routing 
	r.HandleFunc("/", serveHome).Methods("GET");
	r.HandleFunc("/courses", getAllCourse).Methods("GET");
	r.HandleFunc("/course/{id}", getOneCourses).Methods("GET")
	r.HandleFunc("/course", createOneCourse).Methods("POST")
	r.HandleFunc("/course/{id}", updateOneCourse).Methods("PUT")
	r.HandleFunc("/course/{id}", deleteOneCourse).Methods("DELETE")

	// listen in port

	log.Fatal(http.ListenAndServe(":4000",r))

}

func serveHome(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("<h1>Welcome to API by LearnCodeOnline</h1>"))
}


func getAllCourse(w http.ResponseWriter, r *http.Request){
	fmt.Println("Get all courses")
	w.Header().Set("Content-Type","application/json")
	json.NewEncoder(w).Encode(courses)
}

func getOneCourses(w http.ResponseWriter, r *http.Request){
	fmt.Println("Get  single courses");
	w.Header().Set("Content-Type", "application/json");

	// get the params 
	params := mux.Vars(r);


	// for loop through the course and find the course 

	for _, course := range courses{
		if course.CourseId == params["id"]{
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(course)
			return
		}
	}
	// if no course found with id

	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]string{"message":"Course not found"})
}


func createOneCourse(w http.ResponseWriter, r *http.Request){
	fmt.Printf("Create  course ");

	w.Header().Set("Content-Type","application/json");

	if r.Body == nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode("Empty data")
		return 
	}

	var course Course;
	_ = json.NewDecoder(r.Body).Decode(&course);

	if course.isEmpty() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode("No data inside json")
		return
	}

	// rand.Seed(time.Now().UnixNano())
	// course.CourseId = strconv.Itoa(rand.Intn(100))
	course.CourseId = "asd";
	courses = append(courses, course)
	w.WriteHeader(http.StatusOK);
	json.NewEncoder(w).Encode(course);
	return
}


func updateOneCourse(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Update one course")
	w.Header().Set("Content-Type", "applicatioan/json")

	params := mux.Vars(r)

	for index, course := range courses {
		if course.CourseId == params["id"] {
			courses = append(courses[:index], courses[index+1:]...)
			var course Course
			_ = json.NewDecoder(r.Body).Decode(&course)
			course.CourseId = params["id"]
			courses = append(courses, course)
			json.NewEncoder(w).Encode(course)
			return
		}
	}
}



func deleteOneCourse(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Delete one course")
	w.Header().Set("Content-Type", "applicatioan/json")

	params := mux.Vars(r)

	//loop, id, remove (index, index+1)

	for index, course := range courses {
		if course.CourseId == params["id"] {
			courses = append(courses[:index], courses[index+1:]...)
			break
		}
	}
}

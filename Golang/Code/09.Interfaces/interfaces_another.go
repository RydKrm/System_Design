package interfaces

import "fmt"

type shape interface {
	area() float64
	perim() float64
}

// ? create struct with and their constructor function

type rectangle struct {
	width, height float64
}

type circle struct {
	radius float64
}

func (r rectangle) area() float64 {
	return r.width * r.height
}

func (c circle) area() float64 {
	return 3.14 * c.radius * c.radius
}

func (r rectangle) perim() float64 {
	return 2 * (r.height + r.height)
}

func (c circle) perim() float64 {
	return 2 * 3.14 * c.radius
}

func measure(shape shape) {
	fmt.Println(shape.area())
	fmt.Println(shape.perim())
}

func Geometry() {
	r := rectangle{width:12, height:10}
	c := circle{radius:5}
	fmt.Println(r.area())
	measure(r)
	measure(c)
}
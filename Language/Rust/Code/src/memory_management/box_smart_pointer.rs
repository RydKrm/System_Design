// A Box in Rust is the simplest kind of smart pointer. 
// You can think of it as a small wrapper that lets you store data on the heap instead of the stack,
// while still giving you ownership of that data.

trait UIComponent {
    fn render(&self){
        println!("Rendering component...");
    }
}

struct Button {
    text:String
}

impl UIComponent for Button {}

// Recursive container need the Box smart pointer cause when it's get recursive
// the size of the struct cannot be calculate 
// that way need heap memory to store the data

struct Container {
    name: String,
    child: Box<Container>
}

impl UIComponent for Container{}

fn main(){

    // first button take memory from stack memory
    let button_a = Button{text: "Blue button".to_string()};

    // second button take memory from heap so it's size can be grow and shrink 
    let button_b = Box::new(Button{text: "Green button".to_string()});

    let _components = vec![Box::new(button_a), button_b];

}

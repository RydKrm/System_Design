trait Park{
    fn park(&self);
}

struct VehicleInfo {
    name: String,
    maker:String,
    model: String,
    year: u64
}

struct Car{
    info : VehicleInfo
}

impl Park for Car{
    fn park(&self) {
        println!("A {} is parking beside the tree", self.info.name);
    }
}

impl Car {
    fn new(name:String, maker:String, model:String, year:u64)->Self{
        Car { 
            info: VehicleInfo {
                name,
                year,
                model,
                maker
            }
        }
    }

    fn who_build(&self){
        println!("This {} is build by {} in {} ", self.info.name, self.info.maker, self.info.year);
    }
}
// Park trait is the super trait of Paint
// Any type that implements Paint trait must also need to implements to Park traits
// when Paint is implements with ny struck first check Park is implements or not    
trait Paint:Park {
    fn paint(&self, color:String){
        println!("painting with color {}.", color);
    }
    
}

struct Truck {
    info: VehicleInfo
}

struct House {}

impl Park for Truck {
    fn park(&self) {
        println!("A {} is parking beside the tree", self.info.name);
    }
}

impl Paint for Truck{
    
}

impl Park for House {
    fn park(&self) {
        
    }
}

impl Paint for House {
    fn paint(&self, color:String) {
        println!("Painting house with {} ", color);
    }
}

fn paint_red<T:Park>(object: &T){
    // object.paint("red".to_string());
    object.park();
}

fn paint_blue<T:Paint>(object: &T){
    object.paint("blue".to_string());
    object.park();
}

fn paint_green<T>(object: &T) where T:Paint {
    object.paint("green".to_string());
}

fn create_paint_able_object() -> impl Paint{
    House{}
}

fn main(){
    let car = Car::new(
        "tesla".to_string(),
        "CarX".to_string(),
        "XPA5".to_string(),
        2015
    );

    car.who_build();

    let house = House{};

    paint_green(&house);
    paint_red(&car);
}


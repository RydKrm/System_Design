// trait Crud {
//    type user_name;

//    fn printName(&self)->user_name;

//    fn create(&self)->Self;

//    fn update(&self)->Self{
//       self.create();
//    }

//    fn list(&self);

// }

use std::vec;

trait Container {
    type ContainerType;

    fn create(&self)-> Self::ContainerType;

    fn get(&self)->String;

    fn store(&self,list: Vec<Self::ContainerType>) -> Vec<Self::ContainerType>;

    fn delete(&self);
}

struct Mobile{
    name:String,
    model:String,
    price:i32
}

impl Container for Mobile{

    type ContainerType =  Vec<Mobile>;

    fn create(&self)->Self::ContainerType {
        let mut list:Self::ContainerType = Self::ContainerType::new();
        let new_mobile = Mobile{
            name: "Motorola ".to_string(),
            model: "rtx".to_string(),
            price: 12300,
        };
        list.push(new_mobile);

        list
    }

    fn get(&self)->String {
        "product created".to_string()
    }

    fn store(&self, vec:Vec<Self::ContainerType>) -> Vec<Self::ContainerType> {
        
        let current_mobile = Mobile{
            name: "Motorola ".to_string(),
            model: "rtx".to_string(),
            price: 12300,
        };

        // vec.push(current_mobile);

        vec
        
    }

    fn delete(&self) {
        println!("Item being deleted from here");
    }

}

fn test()-> Vec<Mobile>{
    let new_mobile = Mobile{
        name: "Nokia".to_string(),
        model: "1110rs".to_string(),
        price: 1231,
    };

    let mut list: Vec<Mobile> = Vec::new();

    list.push(new_mobile);

    list
}
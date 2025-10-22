use std::{fmt::Display, ops::Add, process::Output};

fn first_element<T>(list:&[T])->Option<&T>{
    list.first()
}



fn to_lower<T>(data:&T){
    data.clone();
}

fn pair_sum<T,U>(first:T, second:U) -> <T as Add<U>>::Output
where 
 T: Add<U>,
 T:Display,
{
    let total =first + second;
    total
}

fn summation<T>(first:T, second:T) -> T where T:Add<Output = T> + Display + Copy
{
    first + second
}

fn other_function(){
    // let name = String::from("Riyad_Karim");

    // let first = first_element(&name);

    // let age = 12.0;
    let list = vec![1,2,3,4,];

    if let Some(first) = first_element(&list) {
        println!("First Item of the {}", first)
    }

   let total = summation(12, 14);

//    let string_sum = summation("riyad".to_string(), "krim".to_string());

}


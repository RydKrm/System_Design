use crate::structs::structs::Transaction;


mod structs;

mod enums;

fn main() {
    println!("Hello, world!");
    let mut riyad_account = Transaction::new(
        "Riyad_Karim".to_string(),
        "RYD_12312".to_string()
    );
}


use crate::structs::structs::{BankAccount, Transaction};


mod structs;

mod enums;

mod traits;

mod generics;

mod closures;

fn main() {
    println!("Hello, world!");
    let mut riyad_account = BankAccount::new(
        "RYD_12312".to_string(),
        "Riyad_Karim".to_string()
    );

    let mut karim_account = BankAccount::new(
        "krm_10010".to_string(),
        "karim".to_string()
    );

    riyad_account.get_current_balance();

    let phone = riyad_account.phone_number;
    match phone {
        Some(number) => println!("Phone number is {}", number),
        None => println!("Has no phone number")
    }

    // println!("account has a phone number {}", number);
    if let Some(new_phone_number) = &riyad_account.phone_number {
        println!("Riyad account has a phone number {}", new_phone_number);
    }

    if let Some(get_phone) = &riyad_account.phone_number {
        println!("Calling riyad phone number {}", get_phone);
    }

    // return if get any reports 
    let new_phone_number = karim_account.phone_number.unwrap_or("Default phone number".to_string());
    println!("This will get phone number or return from here {}", new_phone_number);

    riyad_account.make_deposit(10000.0, "Salary".to_string());

    karim_account.make_deposit(15000.0, "october salary".to_string());

    println!("current amount ----->>>>>>>>>> {}", riyad_account.get_current_balance());

    let phone_number = &riyad_account.phone_number.unwrap_or("01712345678".to_string());
    println!("Get phone number or default value {}", phone_number);
    

}


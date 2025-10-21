use crate::structs::structs::{BankAccount, Transaction};


mod structs;

mod enums;

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

    riyad_account.make_deposit(10000.0, "Salary".to_string());

    karim_account.make_deposit(15000.0, "october salary".to_string());

    println!("current amount ----->>>>>>>>>> {}", riyad_account.get_current_balance());



}


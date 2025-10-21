use core::time;
use std::fmt::Error;
use crate::enums::enums::TransactionType;

#[derive(Debug)]
pub struct BankAccount{
    account_number:String,
    user_name:String,
    balance:f64,
    transaction_history: Vec<Transaction>
}

#[derive(Debug,Clone)]
pub struct Transaction{
    transaction_type: TransactionType,
    amount:f64,
    timestamp:String,
    description:String
}



pub impl BankAccount {
    pub fn new(account_number:String, user_name:String) -> Self{
        Self{
            account_number,
            user_name,
            balance : 0,
            transaction_history: Vec::new()
        }
    }

    pub fn account_with_initial(account_number:String, user_name:String, balance:f64) -> Result<Self,String>{
        if balance < 0 {
            Err("Opening Balance cannot be lower that zero. Negative balance not allowed".to_string())
        }
        
        println!("Create account with initial balance");
        
        Self { 
            account_number: account_number,
            user_name: user_name,
            balance,
            transaction_history: Vec::new()
        };
        Ok(())
    }

    pub fn get_current_balance(&self)->f64{
        self.balance
    }

    pub fn get_account_number(&self)->String{
        &self.account_number;
    }

    pub fn get_transactions(&self)-> String{
        &self.transaction_history
    }

    pub fn make_deposit(&mut self, amount:f64, description:String)->Result<(), String> {
        if amount <= 0 {
            Err("Deposit amount must be positive number".to_string())
        }
        self.balance += amount;
        let new_transaction = Transaction{
            transaction_type: TransactionType::Deposit,
            amount,
            description,
            timestamp: String::from("2025-10-15 12:00:00")
        };
        self.transaction_history.push(new_transaction);
        Ok(())
    }

    pub fn make_withdraw(&mut self, amount:f64, description: String) -> Result<(), String>{
        if amount <=0 {
            return Err("Amount must be possible".to_string());
        }

        if self.balance < amount {
            Err("Insufficient funds".to_string())
        }

        self.balance -= amount;

        let new_transaction = Transaction{
            amount,
            description,
            transaction_type: TransactionType::Withdrawal,
            timestamp: String::from("2025-10-21")
        };

        self.transaction_history.push(new_transaction);
        Ok(());
    }

    pub fn make_fund_transfer(&mut self,other_account:&mut BankAccount , amount:f64 ) -> Result<(), String>{
        if amount <= 0 {
            Err(String::from("Only positive amount is allowed to transfer"));
        }

        if self.balance < amount {
            Err(String::from("Insufficient funds"))
        }

        self.balance -= amount;

        let new_withdraw_transfer = Transaction{
            amount,
            description: "Found Transfer another account".to_string(),
            timestamp: String::from("2025-10-21"),
            transaction_type: TransactionType::Deposit 
        };
        self.transaction_history.push(new_withdraw_transfer);

        other_account.balance = amount;
        let new_deposit_transfer = Transaction{
            amount,
            description: String::from("Account amount created"),
            timestamp: String::from("2025-10-21"),
            transaction_type: TransactionType::Transfer
        };
        other_account.transaction_history.push(new_deposit_transfer);

        Ok(());
    }

    pub fn total_deposit(&self) -> f64{
        let mut total = 0.0;
        for tr in &self.transaction_history {
            if tr.transaction_type == TransactionType::Deposit {
                total += tr.amount
            }
        }

        total

        // english way 
        // self.transaction_history
        // .iter()
        // .filter(|tr| matches!(tr.transaction_type, TransactionType::Deposit))
        // .map(|t| t.amount)
        // .sum();

    }

}


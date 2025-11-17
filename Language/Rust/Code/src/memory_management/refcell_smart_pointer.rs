/*
Rc gives shared ownership, but it doesn’t let you mutate the shared data because Rust enforces borrow rules at compile time.
That’s where RefCell<T> comes in: it enforces the same rules, but at runtime instead of compile time.

1. What RefCell<T> really does
- It allows only one mutable borrow or many immutable borrows — just like Rust’s normal rules.
- But it checks this at runtime.

If you try to break the rule (e.g., borrow mutably while it’s already borrowed immutably), your program panics.
*/

use std::rc::Rc;
use std::cell::RefCell;

struct Database {
    max_connections: u32
}

struct AuthService {
    db: Rc<RefCell<Database>>
}

struct ContentService {
    db: Rc<RefCell<Database>>
}

fn main() {
    let db = Rc::new(RefCell::new(Database {
        max_connections: 100
    }));
    let auth_service = AuthService { db: Rc::clone(&db) };
    let content_service = ContentService { db: Rc::clone(&db) };
    
    let mut r1 = db.borrow_mut();
    let r2 = db.borrow_mut();
    r1.max_connections = 200;
}
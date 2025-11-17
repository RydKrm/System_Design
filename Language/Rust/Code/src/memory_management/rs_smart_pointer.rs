/*
1. What is Rc?
Rc<T> stands for Reference Counted smart pointer.
It allows multiple owners of the same heap-allocated data in a single thread.

Think of it like: you have one expensive object (like a config or database connection), 
and several parts of your program want to share it without copying.

2. How it works
- When you create an Rc, it starts with a reference count of 1.
- Every time you call Rc::clone(&rc), the count goes up by 1 (note: clone here does not clone the data,
just the pointer).
- When an Rc goes out of scope, the count goes down.
- When the count reaches 0, Rust automatically frees the heap data.

3. Rc Smart pointer cannot be updated it's a readonly function 

*/
use std::rc::Rc;
struct Database {
    max_connections:u32
}

struct AuthService{
    db:Rc<Database>
}

struct ContentService {
    db:Rc<Database>
}

fn main(){
    let db = Rc::new(Database{
        max_connections: 100
    });

    let auth_service = AuthService{
        db: Rc::clone(&db)
    };

    let content_service = ContentService{
        db: Rc::clone(&db)
    };

    // Rc smart pointer is can not be updated , it's read only 
    // db.max_connections = 200;
  
}

use std::{fs::File, io::{self, Read}};

fn read_file(filename:&str) -> Result<String, io::Error>{
    let mut file = File::open(filename)?;
    let mut contents = String::new();
    file.read_to_string( &mut contents)?;
    Ok(contents)
}

fn main(){
    let _contents = read_file("test.exe");
}
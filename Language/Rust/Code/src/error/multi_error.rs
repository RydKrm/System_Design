use std::{fs, num::ParseIntError};



enum ParseFileError{
    File,
    Parse(ParseIntError)
}

fn parse_file(file_name:&str) -> Result<i32, ParseFileError> {
    let s = fs::read_to_string(file_name).
          map_err(|_e| ParseFileError::File)?;

    let i = s.parse()
     .map_err(|e| ParseFileError::Parse(e))?;

    Ok(i)

}

fn main(){
     let i = parse_file("example.txt");

     match i {
        Ok(num) => println!("number is {}", num),
        Err(err) => {
            match err {
                ParseFileError::File => {
                    println!("Cannot Open file here");
                },
                ParseFileError::Parse(e) => {
                    println!("Error happen here {}", e);
                }

            }
        }
     }

}
fn main(){
    // basic closures

    // let's checker 
    let mut is_checker = false;
    let mut before_value = 10;

    let prefix_value_sum = move |a:i32, b:i32| {
        if is_checker {
            println!("with before {}",a + b + before_value);
        } else {
            // before_value = a + b;
            println!("without before {}",before_value);
        }
        drop(before_value);
        drop(is_checker);
    };

    // is_checker = false;

    prefix_value_sum(12,13);
    // is_checker = true;
    prefix_value_sum(12,18);

}
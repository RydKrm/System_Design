

fn first_turn<'a>(p1:&'a String, p2:&'a String)->&'a String{
    if p1 == "win" {
       p1
    } else {
        p2
    }
}

fn main(){

    let result: &String;
        let player1 = "win".to_string();
        let player2 = "lose".to_string();
        result = first_turn(&player1, &player2);
    
    println!("player -> {}", result);
}
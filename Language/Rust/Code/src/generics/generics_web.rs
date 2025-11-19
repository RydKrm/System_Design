struct WebCommand<T>{
    command:String,
    payload: T
}

impl <T> WebCommand<T> {
    fn new(command:String, payload:T) -> Self{
        WebCommand{
            command,
             payload
        }
    }

    fn get_payload(&self)->&T {
        &self.payload
    }

}

impl WebCommand<String> {
    fn print_payload(&self){
        println!("Payload is {}", self.payload);
    }
}

fn main(){
    let cmd1 = WebCommand::new( 
        "connected port 200".to_string(), 
        200
    );

    let cmd2 = WebCommand::new(
        "get user name".to_string(),
        "riyad".to_string()
    );

    cmd1.get_payload();
    cmd2.print_payload();

}
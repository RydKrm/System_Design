struct Tweet<'a>{
    content: &'a str
}  

impl <'a> Tweet<'a> {

    fn new(content:&'a str)->Self {
        Tweet { content }
    }

    fn replace_content(&mut self, new_content: &'a str) -> &'a str{
        let old_content = self.content;
        self.content = new_content;
        old_content
    }

}

fn main(){
    let mut tweet = Tweet ::new("learning rust"); // content live here 
    /*
      tweet {
       content : "learning rust" 
      }
       replace():fn replace(){}
     */

    let old_current = tweet.replace_content("learning advance rust");
     
    // now content live old_content has the tweet.content  cause replace_content return tweet.content reference 

    println!("new  content {} ", tweet.content);
    println!("current content {} ", old_current);

}
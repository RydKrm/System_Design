// Non-exception Failures
// * when some thing is used that is not even created

const newUser: { name: string, age: number } = {
    name: "Daniel",
    age: 26,
};
// user.location; // returns undefined

let message: string;
message = "Hello world"
message.toLocaleLowerCase()
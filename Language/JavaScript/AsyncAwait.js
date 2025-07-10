// ! Async with Await

/*
 *  Async and await make promises easir to write
 *  async makes a function return a Promise
 *  await makes a function wait for a Promise
 *  await keyword can be used only inside async function
 */

/*
 * Create a async function, inside it create a promise which is with is resolve after 1000ms
 * await key word stop the execution untill the promise resolve
 * then console log the function
 */
async function asyncFunc() {
  let promise = new Promise((resolve, reject) => {
    setTimeout(() => resolve("done!"), 1000);
  });

  let result = await promise; // wait until the promise resolves (*)

  console.log(result); // "done!"
}

asyncFunc();

// ? Another good example

// * Function that simulates fetching user data asynchronously
function fetchUserData(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: "John Doe", email: "john@example.com" });
    }, 2000); // * Simulating API request delay
  });
}

// * Function that simulates fetching user's posts asynchronously
function fetchUserPosts(userId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, title: "Post 1", body: "This is the first post." },
        { id: 2, title: "Post 2", body: "This is the second post." },
      ]);
    }, 1500); // * Simulating API request delay
  });
}

//* Function that uses async/await to fetch user data and posts
async function fetchUserDataAndPosts(userId) {
  try {
    console.log("Fetching user data...");
    const userData = await fetchUserData(userId); //* Wait for user data
    console.log("User data:", userData);

    console.log("Fetching user posts...");
    const userPosts = await fetchUserPosts(userId); //* Wait for user posts
    console.log("User posts:", userPosts);

    console.log("Data fetched successfully!");
    return { userData, userPosts };
  } catch (error) {
    console.error("Error fetching user data or posts:", error);
    throw error; //* Rethrow the error
  }
}

//* Call the async function to fetch user data and posts
fetchUserDataAndPosts(123)
  .then((data) => {
    console.log("Data received:", data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });

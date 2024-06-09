const http = require("http");
const host = "localhost";
const port = 8000;

// handle incoming request
// The HTTP request the user sends is captured in a Request object, which corresponds to the first argument, req.
// The HTTP response that we return to the user is formed by interacting with the Response object in second argument, res.
// HTTP status codes indicate how well an HTTP request was handled by the server.
// res.end("My first server!");, writes the HTTP response back to the client who requested
const requestListener = (req, res) => {
  res.writeHead(200);
  res.end("My first server");
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is listening on http://${host}:${port}`);
});

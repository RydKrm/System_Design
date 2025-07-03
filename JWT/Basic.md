### JWT Token verify

For providing authorization and authentication.

#### JWT Used as providing authentication and authorization

When a user logged in with their username/email and password. Server verify the user with database. first check user is exists by email/username and then compare their password. if match then create a access token for that user and sent that to client. After then every time when the user ask for a resource he pass the token to verify authentication.

#### JSON Web Token structure?

In its compact form, JSON Web Tokens consist of three parts separated by dots (.), which are:

1. Header (The header typically consists of two parts: the type of the token, which is JWT, and the signing algorithm being used, such as HMAC SHA256 or RSA)
2. Payload (Contain the payload or data)
3. Signature (It contain the private key)

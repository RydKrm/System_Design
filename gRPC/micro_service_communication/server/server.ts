import * as grpc from "@grpc/grpc-js";
import *  as protoLoader from "@grpc/proto-loader";
import * as path from "path";

const PROTO_PATH = path.join(__dirname, "../protos/users.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, // Preserve field names
    longs: String,  // Use string for long values like js does not support 64-bit integers
    enums: String,  // Use string for enum values instead of numeric values
    defaults: true, // Set default values for omitted fields in messages
    oneofs: true    // Include oneof fields in the output
})

const userProto = grpc.loadPackageDefinition(packageDefinition).users as any;
const users = new Map();

let usersId = 1;

const server = new grpc.Server();

server.addService(userProto.UserService.service, {
    GetSingleUser: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
        const userId = call.request.id;
        console.log("Fetching user with ID:", userId);
        if (users.has(userId)) {
            callback(null, users.get(userId));
        } else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "User not found"
            });
        }
    },

    CreateUser: (call:grpc.ServerUnaryCall<any,any>, callback: grpc.sendUnaryData<any>) => {
        const user = call.request;

        console.log("Creating user:", user);

        const newUser = {
            id: usersId++,
            name: user.name,
            email: user.email,
            password: user.password
        }

        users.set(newUser.id, newUser);
        callback(null, newUser);
    }

});

const PORT = process.env.PORT || 50051;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(`Server running at http://0.0.0.0:${port}`);
})


import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const PROTO_PATH = path.join(__dirname, '../protos/users.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const userProto = grpc.loadPackageDefinition(packageDefinition).users as any;

const client = new userProto.UserService(
    '0.0.0.0:50051',
    grpc.credentials.createInsecure()
);

// Call CreateUser
client.CreateUser(
    {
        name: 'John Doe 2',
        email: 'johndoe2@gmail.com',
        password: '123456'
    },
    (err: grpc.ServiceError | null, response: any) => {
        if (err) {
            console.error('Error creating user:', err);
            return;
        }
        console.log('User created:', response);
    }
);

// Call GetSingleUser
client.GetSingleUser({ id: 1 }, (err: grpc.ServiceError | null, response: any) => {
    if (err) {
        console.error('Error fetching user:', err);
        return;
    }
    console.log('User fetched:', response);
});

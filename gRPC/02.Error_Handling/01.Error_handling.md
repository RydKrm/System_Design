# gRPC Error Handling with Node.js & TypeScript: A Complete Developer's Guide

## Table of Contents
1. [Why gRPC Error Handling Matters](#why-grpc-error-handling-matters)
2. [gRPC Status Codes Overview](#grpc-status-codes-overview)
3. [Handling Errors in Client Code](#handling-errors-in-client-code)
4. [Returning Errors from Server Methods](#returning-errors-from-server-methods)
5. [Error Propagation Across Services](#error-propagation-across-services)
6. [Basic Debugging Techniques](#basic-debugging-techniques)
7. [Real-World Implementation Strategy](#real-world-implementation-strategy)

---

## Why gRPC Error Handling Matters

Imagine you're building an e-commerce platform using microservices where the order service needs to talk to inventory, payment, and shipping services. Without proper error handling, a simple inventory check failure could leave customers with orders in limbo and support teams drowning in "something went wrong" tickets.

gRPC error handling provides:
- **Standardized error communication** across different Node.js services
- **Type-safe error information** that TypeScript clients can handle intelligently
- **Structured debugging context** for tracing issues across service boundaries
- **Graceful degradation** when external dependencies fail

Think of it as your distributed system's nervous system - it carries important signals about what's happening throughout your application ecosystem.

---

## gRPC Status Codes Overview

gRPC uses standardized status codes that work seamlessly with Node.js and TypeScript. These codes help both developers and automated systems understand and respond to different error conditions.

### Essential Status Codes in Node.js

```typescript
import { status } from '@grpc/grpc-js';

// The status codes you'll use 90% of the time
const CommonStatusCodes = {
  OK: status.OK,                           // 0 - Success
  CANCELLED: status.CANCELLED,             // 1 - Operation cancelled by caller
  UNKNOWN: status.UNKNOWN,                 // 2 - Unknown error occurred
  INVALID_ARGUMENT: status.INVALID_ARGUMENT, // 3 - Client sent invalid data
  DEADLINE_EXCEEDED: status.DEADLINE_EXCEEDED, // 4 - Operation timed out
  NOT_FOUND: status.NOT_FOUND,             // 5 - Requested resource doesn't exist
  ALREADY_EXISTS: status.ALREADY_EXISTS,   // 6 - Resource already exists
  PERMISSION_DENIED: status.PERMISSION_DENIED, // 7 - Insufficient permissions
  RESOURCE_EXHAUSTED: status.RESOURCE_EXHAUSTED, // 8 - Rate limit or quota exceeded
  FAILED_PRECONDITION: status.FAILED_PRECONDITION, // 9 - System in wrong state
  ABORTED: status.ABORTED,                 // 10 - Operation aborted due to conflict
  OUT_OF_RANGE: status.OUT_OF_RANGE,       // 11 - Value out of valid range
  UNIMPLEMENTED: status.UNIMPLEMENTED,     // 12 - Method not implemented
  INTERNAL: status.INTERNAL,               // 13 - Internal server error
  UNAVAILABLE: status.UNAVAILABLE,         // 14 - Service unavailable
  DATA_LOSS: status.DATA_LOSS,             // 15 - Unrecoverable data corruption
  UNAUTHENTICATED: status.UNAUTHENTICATED  // 16 - Authentication required
};
```

### Real-World Status Code Examples

```typescript
import { ServerUnaryCall, sendUnaryData, status } from '@grpc/grpc-js';
import { ServiceError } from '@grpc/grpc-js';

interface GetProductRequest {
  productId: string;
  userId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

class ProductService {
  // Example showing different error scenarios in an e-commerce context
  async getProduct(
    call: ServerUnaryCall<GetProductRequest, Product>,
    callback: sendUnaryData<Product>
  ): Promise<void> {
    const { productId, userId } = call.request;

    try {
      // 1. Input validation - INVALID_ARGUMENT
      if (!productId?.trim()) {
        const error: ServiceError = {
          name: 'InvalidArgument',
          message: 'Product ID is required and cannot be empty',
          code: status.INVALID_ARGUMENT,
          details: 'productId field must be a non-empty string'
        };
        return callback(error);
      }

      // 2. Authentication check - UNAUTHENTICATED
      const authToken = call.metadata.get('authorization')[0] as string;
      if (!authToken) {
        const error: ServiceError = {
          name: 'Unauthenticated',
          message: 'Authentication token required',
          code: status.UNAUTHENTICATED,
          details: 'Please provide valid authentication credentials'
        };
        return callback(error);
      }

      // 3. Database lookup - NOT_FOUND
      const product = await this.findProductById(productId);
      if (!product) {
        const error: ServiceError = {
          name: 'NotFound',
          message: `Product with ID ${productId} not found`,
          code: status.NOT_FOUND,
          details: `No product exists with the provided ID: ${productId}`
        };
        return callback(error);
      }

      // 4. Permission check - PERMISSION_DENIED
      const canAccess = await this.checkUserPermissions(userId, productId);
      if (!canAccess) {
        const error: ServiceError = {
          name: 'PermissionDenied',
          message: 'Insufficient permissions to access this product',
          code: status.PERMISSION_DENIED,
          details: 'User does not have read access to the requested product'
        };
        return callback(error);
      }

      // 5. Success case
      callback(null, product);

    } catch (dbError) {
      // 6. Unexpected errors - INTERNAL (don't expose internal details)
      console.error('Database error in getProduct:', dbError);
      const error: ServiceError = {
        name: 'Internal',
        message: 'An internal error occurred while retrieving the product',
        code: status.INTERNAL,
        details: 'Please try again later or contact support if the issue persists'
      };
      callback(error);
    }
  }

  private async findProductById(id: string): Promise<Product | null> {
    // Simulate database lookup
    if (id === 'timeout-test') {
      throw new Error('Database connection timeout');
    }
    if (id === 'prod-123') {
      return {
        id: 'prod-123',
        name: 'Wireless Headphones',
        price: 199.99,
        inStock: true
      };
    }
    return null;
  }

  private async checkUserPermissions(userId?: string, productId?: string): Promise<boolean> {
    // Simulate permission check
    return userId === 'user-123';
  }
}
```

---

## Handling Errors in Client Code

Client-side error handling in Node.js with TypeScript lets you create robust, user-friendly applications that gracefully handle service failures.

### Basic Client Error Handling

```typescript
import { credentials, Metadata, ServiceError, status } from '@grpc/grpc-js';
import { ProductServiceClient } from './generated/product_grpc_pb';
import { GetProductRequest } from './generated/product_pb';

class ProductClient {
  private client: ProductServiceClient;

  constructor(serverAddress: string) {
    this.client = new ProductServiceClient(
      serverAddress,
      credentials.createInsecure()
    );
  }

  async getProduct(productId: string, authToken: string): Promise<Product | null> {
    return new Promise((resolve, reject) => {
      const request = new GetProductRequest();
      request.setProductId(productId);

      const metadata = new Metadata();
      metadata.add('authorization', `Bearer ${authToken}`);

      // Set a 5-second deadline
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);

      this.client.getProduct(request, metadata, { deadline }, (error: ServiceError | null, response) => {
        if (error) {
          // Handle different types of gRPC errors
          switch (error.code) {
            case status.NOT_FOUND:
              console.log(`Product ${productId} not found`);
              resolve(null); // Return null for not found (not an error for UI)
              break;

            case status.INVALID_ARGUMENT:
              reject(new Error(`Invalid request: ${error.details}`));
              break;

            case status.UNAUTHENTICATED:
              // Trigger re-authentication flow
              this.handleAuthenticationError();
              reject(new Error('Authentication required. Please log in again.'));
              break;

            case status.PERMISSION_DENIED:
              reject(new Error('You do not have permission to view this product'));
              break;

            case status.DEADLINE_EXCEEDED:
              reject(new Error('Request timed out. Please check your connection and try again.'));
              break;

            case status.UNAVAILABLE:
              reject(new Error('Service temporarily unavailable. Please try again in a moment.'));
              break;

            case status.RESOURCE_EXHAUSTED:
              reject(new Error('Too many requests. Please wait before trying again.'));
              break;

            case status.INTERNAL:
              console.error('Internal server error:', error.details);
              reject(new Error('A server error occurred. Our team has been notified.'));
              break;

            default:
              console.error('Unexpected gRPC error:', error);
              reject(new Error('An unexpected error occurred. Please try again.'));
          }
        } else {
          // Success case
          const product: Product = {
            id: response.getId(),
            name: response.getName(),
            price: response.getPrice(),
            inStock: response.getInStock()
          };
          resolve(product);
        }
      });
    });
  }

  private handleAuthenticationError(): void {
    // Clear stored tokens, redirect to login, etc.
    console.log('Authentication expired, redirecting to login...');
  }
}
```

### Advanced Client with Retry Logic

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: status[];
}

class ResilientProductClient {
  private client: ProductServiceClient;
  private retryConfig: RetryConfig;

  constructor(serverAddress: string, retryConfig?: Partial<RetryConfig>) {
    this.client = new ProductServiceClient(serverAddress, credentials.createInsecure());
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 5000,
      retryableStatusCodes: [
        status.UNAVAILABLE,
        status.DEADLINE_EXCEEDED,
        status.INTERNAL,
        status.RESOURCE_EXHAUSTED
      ],
      ...retryConfig
    };
  }

  async getProductWithRetry(productId: string, authToken: string): Promise<Product | null> {
    let lastError: ServiceError | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Add jittered delay for retries
        if (attempt > 0) {
          await this.delay(this.calculateBackoffDelay(attempt));
        }

        const product = await this.attemptGetProduct(productId, authToken);
        return product;

      } catch (error) {
        lastError = error as ServiceError;

        // Don't retry certain errors
        if (!this.shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        console.log(`Attempt ${attempt + 1} failed, retrying...`, {
          productId,
          errorCode: lastError.code,
          errorMessage: lastError.message
        });
      }
    }

    throw new Error(`Failed to get product after ${this.retryConfig.maxRetries} retries. Last error: ${lastError?.message}`);
  }

  private shouldRetry(error: ServiceError, attempt: number): boolean {
    // Don't retry if we've hit max attempts
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }

    // Only retry specific status codes
    return this.retryConfig.retryableStatusCodes.includes(error.code);
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private attemptGetProduct(productId: string, authToken: string): Promise<Product | null> {
    return new Promise((resolve, reject) => {
      const request = new GetProductRequest();
      request.setProductId(productId);

      const metadata = new Metadata();
      metadata.add('authorization', `Bearer ${authToken}`);

      this.client.getProduct(request, metadata, (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            id: response.getId(),
            name: response.getName(),
            price: response.getPrice(),
            inStock: response.getInStock()
          });
        }
      });
    });
  }
}
```

---

## Returning Errors from Server Methods

Server-side error handling is about creating meaningful error responses while protecting your internal systems from information leakage.

### Structured Error Response Pattern

```typescript
import { status, ServiceError } from '@grpc/grpc-js';

interface ErrorDetail {
  field?: string;
  message: string;
  errorCode?: string;
}

class GrpcErrorHelper {
  static createError(
    code: status,
    message: string,
    details?: string | ErrorDetail[]
  ): ServiceError {
    const error: ServiceError = {
      name: this.getErrorName(code),
      message,
      code,
      details: typeof details === 'string' ? details : JSON.stringify(details)
    };
    return error;
  }

  private static getErrorName(code: status): string {
    const statusNames: Record<status, string> = {
      [status.OK]: 'OK',
      [status.CANCELLED]: 'Cancelled',
      [status.UNKNOWN]: 'Unknown',
      [status.INVALID_ARGUMENT]: 'InvalidArgument',
      [status.DEADLINE_EXCEEDED]: 'DeadlineExceeded',
      [status.NOT_FOUND]: 'NotFound',
      [status.ALREADY_EXISTS]: 'AlreadyExists',
      [status.PERMISSION_DENIED]: 'PermissionDenied',
      [status.RESOURCE_EXHAUSTED]: 'ResourceExhausted',
      [status.FAILED_PRECONDITION]: 'FailedPrecondition',
      [status.ABORTED]: 'Aborted',
      [status.OUT_OF_RANGE]: 'OutOfRange',
      [status.UNIMPLEMENTED]: 'Unimplemented',
      [status.INTERNAL]: 'Internal',
      [status.UNAVAILABLE]: 'Unavailable',
      [status.DATA_LOSS]: 'DataLoss',
      [status.UNAUTHENTICATED]: 'Unauthenticated'
    };
    return statusNames[code] || 'Unknown';
  }
}

// Advanced validation and error handling
interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

class UserService {
  async createUser(
    call: ServerUnaryCall<CreateUserRequest, User>,
    callback: sendUnaryData<User>
  ): Promise<void> {
    try {
      const { name, email, age } = call.request;

      // Comprehensive validation
      const validationErrors = this.validateCreateUserRequest(call.request);
      if (validationErrors.length > 0) {
        const error = GrpcErrorHelper.createError(
          status.INVALID_ARGUMENT,
          'Validation failed',
          validationErrors
        );
        return callback(error);
      }

      // Check for duplicate email
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        const error = GrpcErrorHelper.createError(
          status.ALREADY_EXISTS,
          'User with this email already exists',
          `A user with email '${email}' is already registered`
        );
        return callback(error);
      }

      // Rate limiting check
      const clientIP = call.getPeer();
      const isRateLimited = await this.checkRateLimit(clientIP);
      if (isRateLimited) {
        const error = GrpcErrorHelper.createError(
          status.RESOURCE_EXHAUSTED,
          'Rate limit exceeded',
          'Too many user creation requests from this IP. Please wait before trying again.'
        );
        return callback(error);
      }

      // Create the user
      const newUser = await this.createUserInDatabase({ name, email, age });
      
      // Send welcome email (don't fail the request if this fails)
      this.sendWelcomeEmail(newUser.email).catch(emailError => {
        console.warn('Failed to send welcome email:', emailError);
      });

      callback(null, newUser);

    } catch (error) {
      console.error('Unexpected error in createUser:', error);
      
      // Determine appropriate error response
      if (this.isDatabaseConnectionError(error)) {
        const grpcError = GrpcErrorHelper.createError(
          status.UNAVAILABLE,
          'Service temporarily unavailable',
          'Database connection issues. Please try again in a moment.'
        );
        callback(grpcError);
      } else {
        const grpcError = GrpcErrorHelper.createError(
          status.INTERNAL,
          'Internal server error',
          'An unexpected error occurred. Our team has been notified.'
        );
        callback(grpcError);
      }
    }
  }

  private validateCreateUserRequest(request: CreateUserRequest): ErrorDetail[] {
    const errors: ErrorDetail[] = [];

    // Name validation
    if (!request.name?.trim()) {
      errors.push({
        field: 'name',
        message: 'Name is required',
        errorCode: 'FIELD_REQUIRED'
      });
    } else if (request.name.length < 2) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 2 characters long',
        errorCode: 'FIELD_TOO_SHORT'
      });
    } else if (request.name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Name cannot exceed 100 characters',
        errorCode: 'FIELD_TOO_LONG'
      });
    }

    // Email validation
    if (!request.email?.trim()) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        errorCode: 'FIELD_REQUIRED'
      });
    } else if (!this.isValidEmail(request.email)) {
      errors.push({
        field: 'email',
        message: 'Email format is invalid',
        errorCode: 'FIELD_INVALID_FORMAT'
      });
    }

    // Age validation
    if (request.age == null) {
      errors.push({
        field: 'age',
        message: 'Age is required',
        errorCode: 'FIELD_REQUIRED'
      });
    } else if (request.age < 13) {
      errors.push({
        field: 'age',
        message: 'Users must be at least 13 years old',
        errorCode: 'FIELD_OUT_OF_RANGE'
      });
    } else if (request.age > 120) {
      errors.push({
        field: 'age',
        message: 'Please enter a valid age',
        errorCode: 'FIELD_OUT_OF_RANGE'
      });
    }

    return errors;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    // Simulate database lookup
    return null;
  }

  private async checkRateLimit(clientIP: string): Promise<boolean> {
    // Implement rate limiting logic
    return false;
  }

  private async createUserInDatabase(userData: CreateUserRequest): Promise<User> {
    // Simulate user creation
    return {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      age: userData.age,
      createdAt: new Date()
    };
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    // Implement email sending
    console.log(`Sending welcome email to ${email}`);
  }

  private isDatabaseConnectionError(error: any): boolean {
    // Check if error is related to database connectivity
    return error?.code === 'ECONNREFUSED' || 
           error?.code === 'ETIMEDOUT' ||
           error?.message?.includes('connection');
  }
}
```

---

## Error Propagation Across Services

In microservices architectures, errors often need to flow through multiple services. Here's how to handle error propagation effectively.

### Service-to-Service Error Handling

```typescript
// Order service that depends on inventory and payment services
import { InventoryServiceClient } from './generated/inventory_grpc_pb';
import { PaymentServiceClient } from './generated/payment_grpc_pb';

interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  paymentMethodId: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
}

class OrderService {
  constructor(
    private inventoryClient: InventoryServiceClient,
    private paymentClient: PaymentServiceClient
  ) {}

  async createOrder(
    call: ServerUnaryCall<CreateOrderRequest, Order>,
    callback: sendUnaryData<Order>
  ): Promise<void> {
    const { userId, items, paymentMethodId } = call.request;
    
    try {
      // Step 1: Validate inventory for all items
      const inventoryCheck = await this.checkInventoryAvailability(items);
      if (!inventoryCheck.success) {
        // Propagate inventory service error with context
        const error = this.createContextualError(
          inventoryCheck.error,
          'Inventory check failed',
          { step: 'inventory_validation', items }
        );
        return callback(error);
      }

      // Step 2: Calculate total amount
      const totalAmount = inventoryCheck.items.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      );

      // Step 3: Process payment
      const paymentResult = await this.processPayment(
        userId, 
        paymentMethodId, 
        totalAmount
      );
      
      if (!paymentResult.success) {
        // Payment failed - return specific error
        const error = this.createContextualError(
          paymentResult.error,
          'Payment processing failed',
          { step: 'payment_processing', totalAmount }
        );
        return callback(error);
      }

      // Step 4: Reserve inventory
      const reservationResult = await this.reserveInventory(items);
      if (!reservationResult.success) {
        // Inventory reservation failed - need to refund payment
        await this.refundPayment(paymentResult.transactionId);
        
        const error = this.createContextualError(
          reservationResult.error,
          'Inventory reservation failed',
          { step: 'inventory_reservation', rollback: 'payment_refunded' }
        );
        return callback(error);
      }

      // Success - create order record
      const order: Order = {
        id: `order-${Date.now()}`,
        userId,
        items,
        totalAmount,
        status: 'confirmed',
        createdAt: new Date()
      };

      callback(null, order);

    } catch (unexpectedError) {
      console.error('Unexpected error in order creation:', unexpectedError);
      
      const error = GrpcErrorHelper.createError(
        status.INTERNAL,
        'Order creation failed',
        'An unexpected error occurred during order processing'
      );
      callback(error);
    }
  }

  private async checkInventoryAvailability(items: OrderItem[]) {
    return new Promise<{
      success: boolean;
      items?: Array<OrderItem & { price: number }>;
      error?: ServiceError;
    }>((resolve) => {
      // Call inventory service
      this.inventoryClient.checkAvailability({items}, (error, response) => {
        if (error) {
          resolve({ success: false, error });
        } else {
          resolve({ 
            success: true, 
            items: response.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price
            }))
          });
        }
      });
    });
  }

  private async processPayment(userId: string, paymentMethodId: string, amount: number) {
    return new Promise<{
      success: boolean;
      transactionId?: string;
      error?: ServiceError;
    }>((resolve) => {
      this.paymentClient.processPayment({
        userId,
        paymentMethodId,
        amount
      }, (error, response) => {
        if (error) {
          resolve({ success: false, error });
        } else {
          resolve({ 
            success: true, 
            transactionId: response.transactionId 
          });
        }
      });
    });
  }

  private async reserveInventory(items: OrderItem[]) {
    return new Promise<{
      success: boolean;
      error?: ServiceError;
    }>((resolve) => {
      this.inventoryClient.reserveItems({items}, (error, response) => {
        if (error) {
          resolve({ success: false, error });
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  private async refundPayment(transactionId: string): Promise<void> {
    // Implement payment refund logic
    console.log(`Initiating refund for transaction: ${transactionId}`);
  }

  private createContextualError(
    originalError: ServiceError,
    contextMessage: string,
    context: Record<string, any>
  ): ServiceError {
    // Preserve original error code but add context
    const errorWithContext: ServiceError = {
      name: originalError.name,
      message: `${contextMessage}: ${originalError.message}`,
      code: originalError.code,
      details: JSON.stringify({
        originalError: {
          message: originalError.message,
          details: originalError.details
        },
        context
      })
    };

    // Log the full context for debugging
    console.error('Service error with context:', {
      originalError,
      context,
      timestamp: new Date().toISOString()
    });

    return errorWithContext;
  }
}
```

---

## Basic Debugging Techniques

Effective debugging is crucial for maintaining gRPC services. Here are practical techniques for Node.js/TypeScript environments.

### Comprehensive Logging Strategy

```typescript
import { createLogger, format, transports } from 'winston';
import { ServerUnaryCall, ServiceError, status } from '@grpc/grpc-js';

// Create structured logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'grpc-errors.log', level: 'error' }),
    new transports.File({ filename: 'grpc-combined.log' }),
    new transports.Console({ format: format.simple() })
  ]
});

// Middleware for request/response logging
function withLogging<TRequest, TResponse>(
  serviceName: string,
  methodName: string,
  handler: (call: ServerUnaryCall<TRequest, TResponse>, callback: any) => Promise<void>
) {
  return async (call: ServerUnaryCall<TRequest, TResponse>, callback: any) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    
    // Log incoming request
    logger.info('gRPC Request Started', {
      requestId,
      service: serviceName,
      method: methodName,
      peer: call.getPeer(),
      metadata: Object.fromEntries(call.metadata.getMap()),
      request: JSON.stringify(call.request)
    });

    // Wrap callback to log response
    const wrappedCallback = (error: ServiceError | null, response?: TResponse) => {
      const duration = Date.now() - startTime;
      
      if (error) {
        logger.error('gRPC Request Failed', {
          requestId,
          service: serviceName,
          method: methodName,
          duration,
          errorCode: error.code,
          errorName: error.name,
          errorMessage: error.message,
          errorDetails: error.details,
          stack: error.stack
        });
      } else {
        logger.info('gRPC Request Completed', {
          requestId,
          service: serviceName,
          method: methodName,
          duration,
          response: JSON.stringify(response)
        });
      }
      
      callback(error, response);
    };

    try {
      await handler(call, wrappedCallback);
    } catch (unexpectedError) {
      const duration = Date.now() - startTime;
      
      logger.error('gRPC Request Exception', {
        requestId,
        service: serviceName,
        method: methodName,
        duration,
        error: unexpectedError
      });
      
      const grpcError: ServiceError = {
        name: 'Internal',
        message: 'Internal server error',
        code: status.INTERNAL,
        details: 'An unexpected error occurred'
      };
      
      wrappedCallback(grpcError);
    }
  };
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

### Health Check and Monitoring

```typescript
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { HealthImplementation } from 'grpc-health-check';

class GrpcServiceManager {
  private server: Server;
  private healthImpl: HealthImplementation;

  constructor() {
    this.server = new Server();
    this.healthImpl = new HealthImplementation({
      '': 'SERVING', // Overall health
      'ProductService': 'SERVING',
      'UserService': 'SERVING'
    });
  }

  async start(port: number): Promise<void> {
    // Add health check service
    this.server.addService(
      require('grpc-health-check').service,
      this.healthImpl
    );

    // Add your business services with logging
    this.addProductService();
    this.addUserService();

    // Start server
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        ServerCredentials.createInsecure(),
        (error, boundPort) => {
          if (error) {
            reject(error);
          } else {
            this.server.start();
            console.log(`gRPC server running on port ${boundPort}`);
            
            // Set up health monitoring
            this.startHealthMonitoring();
            resolve();
          }
        }
      );
    });
  }

  private addProductService(): void {
    const productService = new ProductService();
    
    this.server.addService(ProductServiceDefinition, {
      getProduct: withLogging('ProductService', 'GetProduct', 
        productService.getProduct.bind(productService)
      ),
      // Add other methods...
    });
  }

  private addUserService(): void {
    const userService = new UserService();
    
    this.server.addService(UserServiceDefinition, {
      createUser: withLogging('UserService', 'CreateUser',
        userService.createUser.bind(userService)
      ),
      // Add other methods...
    });
  }

  private startHealthMonitoring(): void {
    // Check dependencies and update health status
    setInterval(async () => {
      try {
        // Check database connection
        const dbHealthy = await this.checkDatabaseHealth();
        const redisHealthy = await this.checkRedisHealth();
        
        // Update service health based on dependencies
        if (dbHealthy && redisHealthy) {
          this.healthImpl.setStatus('ProductService', 'SERVING');
          this.healthImpl.setStatus('UserService', 'SERVING');
        } else {
          this.healthImpl.setStatus('ProductService', 'NOT_SERVING');
          this.healthImpl.setStatus('UserService', 'NOT_SERVING');
        }
        
      } catch (error) {
        logger.error('Health check failed', { error });
        this.healthImpl.setStatus('', 'NOT_SERVING');
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Implement actual database health check
      return true;
    } catch (error) {
      logger.warn('Database health check failed', { error });
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      // Implement actual Redis health check
      return true;
    } catch (error) {
      logger.warn('Redis health check failed', { error });
      return false;
    }
  }
}
```

### Error Monitoring and Alerting

```typescript
// Error tracking and metrics collection
class ErrorTracker {
  private errorCounts: Map<string, number> = new Map();
  private errorRates: Map<string, number[]> = new Map();

  trackError(service: string, method: string, errorCode: status): void {
    const key = `${service}.${method}.${errorCode}`;
    
    // Increment error count
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Track error rate over time
    const now = Date.now();
    const rateKey = `${service}.${method}`;
    const rates = this.errorRates.get(rateKey) || [];
    rates.push(now);
    
    // Keep only last 5 minutes of data
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    this.errorRates.set(rateKey, rates.filter(time => time > fiveMinutesAgo));
    
    // Check for error rate threshold
    this.checkErrorRateThreshold(service, method);
  }

  private checkErrorRateThreshold(service: string, method: string): void {
    const rateKey = `${service}.${method}`;
    const rates = this.errorRates.get(rateKey) || [];
    
    // Alert if more than 10 errors per minute
    if (rates.length > 50) { // 10 errors/min * 5 minutes
      this.sendAlert({
        severity: 'HIGH',
        service,
        method,
        message: `High error rate detected: ${rates.length} errors in 5 minutes`,
        timestamp: new Date().toISOString()
      });
    }
  }

  private sendAlert(alert: any): void {
    // Integration with alerting systems (PagerDuty, Slack, etc.)
    logger.error('ALERT', alert);
    console.error('🚨 ALERT:', JSON.stringify(alert, null, 2));
  }

  getErrorSummary(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }
}

const errorTracker = new ErrorTracker();

// Enhanced logging middleware with error tracking
function withErrorTracking<TRequest, TResponse>(
  serviceName: string,
  methodName: string,
  handler: (call: ServerUnaryCall<TRequest, TResponse>, callback: any) => Promise<void>
) {
  return withLogging(serviceName, methodName, async (call, callback) => {
    const originalCallback = callback;
    
    const trackedCallback = (error: ServiceError | null, response?: TResponse) => {
      if (error) {
        // Track error for monitoring
        errorTracker.trackError(serviceName, methodName, error.code);
        
        // Add correlation ID for distributed tracing
        const correlationId = call.metadata.get('correlation-id')[0] as string || 
                             generateRequestId();
        
        logger.error('Service Error Tracked', {
          correlationId,
          service: serviceName,
          method: methodName,
          errorCode: error.code,
          errorMessage: error.message
        });
      }
      
      originalCallback(error, response);
    };
    
    await handler(call, trackedCallback);
  });
}
```

### Client-Side Debugging Tools

```typescript
// Enhanced client with debugging capabilities
class DebugProductClient extends ProductClient {
  private debugMode: boolean;
  private requestHistory: Array<{
    timestamp: Date;
    method: string;
    request: any;
    response?: any;
    error?: ServiceError;
    duration: number;
  }> = [];

  constructor(serverAddress: string, debugMode = false) {
    super(serverAddress);
    this.debugMode = debugMode;
  }

  async getProduct(productId: string, authToken: string): Promise<Product | null> {
    const startTime = Date.now();
    const requestData = { productId, authToken: '***' }; // Don't log sensitive data
    
    if (this.debugMode) {
      console.log('🔍 gRPC Request:', {
        method: 'getProduct',
        request: requestData,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const result = await super.getProduct(productId, authToken);
      const duration = Date.now() - startTime;
      
      // Record successful request
      this.requestHistory.push({
        timestamp: new Date(),
        method: 'getProduct',
        request: requestData,
        response: result,
        duration
      });

      if (this.debugMode) {
        console.log('✅ gRPC Success:', {
          method: 'getProduct',
          duration: `${duration}ms`,
          response: result
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const serviceError = error as ServiceError;
      
      // Record failed request
      this.requestHistory.push({
        timestamp: new Date(),
        method: 'getProduct',
        request: requestData,
        error: serviceError,
        duration
      });

      if (this.debugMode) {
        console.log('❌ gRPC Error:', {
          method: 'getProduct',
          duration: `${duration}ms`,
          errorCode: serviceError.code,
          errorMessage: serviceError.message,
          errorDetails: serviceError.details
        });
      }

      throw error;
    }
  }

  // Get debugging information
  getDebugInfo(): {
    requestHistory: typeof this.requestHistory;
    errorSummary: Record<string, number>;
    averageResponseTime: number;
  } {
    const errorSummary: Record<string, number> = {};
    let totalDuration = 0;

    this.requestHistory.forEach(req => {
      totalDuration += req.duration;
      
      if (req.error) {
        const key = `${req.method}_${req.error.code}`;
        errorSummary[key] = (errorSummary[key] || 0) + 1;
      }
    });

    return {
      requestHistory: this.requestHistory,
      errorSummary,
      averageResponseTime: this.requestHistory.length > 0 
        ? totalDuration / this.requestHistory.length 
        : 0
    };
  }

  // Clear debug history
  clearDebugHistory(): void {
    this.requestHistory = [];
  }
}
```

---

## Real-World Implementation Strategy

Now let's put it all together with a practical implementation strategy for your Node.js/TypeScript projects.

### Project Structure

```
my-grpc-service/
├── src/
│   ├── generated/           # Generated gRPC code
│   ├── services/           # Business logic
│   │   ├── product.service.ts
│   │   ├── user.service.ts
│   │   └── order.service.ts
│   ├── clients/            # gRPC clients
│   │   ├── inventory.client.ts
│   │   └── payment.client.ts
│   ├── middleware/         # Error handling middleware
│   │   ├── logging.middleware.ts
│   │   ├── auth.middleware.ts
│   │   └── error-tracking.middleware.ts
│   ├── utils/              # Utilities
│   │   ├── error-helper.ts
│   │   ├── retry.util.ts
│   │   └── validation.util.ts
│   ├── config/             # Configuration
│   │   └── grpc.config.ts
│   └── server.ts           # Main server file
├── proto/                  # Protocol buffer definitions
├── tests/                  # Test files
├── docker-compose.yml      # For local development
└── package.json
```

### Complete Server Implementation

```typescript
// src/server.ts
import { Server, ServerCredentials } from '@grpc/grpc-js';
import { ProductService } from './services/product.service';
import { UserService } from './services/user.service';
import { OrderService } from './services/order.service';
import { withErrorTracking } from './middleware/error-tracking.middleware';
import { logger } from './utils/logger';
import { GrpcConfig } from './config/grpc.config';

class GrpcServer {
  private server: Server;
  private config: GrpcConfig;

  constructor(config: GrpcConfig) {
    this.server = new Server({
      'grpc.keepalive_time_ms': 30000,
      'grpc.keepalive_timeout_ms': 5000,
      'grpc.keepalive_permit_without_calls': true,
      'grpc.http2.max_pings_without_data': 0,
    });
    this.config = config;
  }

  async start(): Promise<void> {
    // Register services with error handling middleware
    this.registerServices();

    // Start server
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${this.config.port}`,
        ServerCredentials.createInsecure(),
        (error, boundPort) => {
          if (error) {
            logger.error('Failed to start gRPC server', { error });
            reject(error);
          } else {
            this.server.start();
            logger.info(`gRPC server running on port ${boundPort}`);
            
            // Set up graceful shutdown
            this.setupGracefulShutdown();
            resolve();
          }
        }
      );
    });
  }

  private registerServices(): void {
    const productService = new ProductService();
    const userService = new UserService();
    const orderService = new OrderService();

    // Register services with middleware
    this.server.addService(ProductServiceDefinition, {
      getProduct: withErrorTracking('ProductService', 'GetProduct',
        productService.getProduct.bind(productService)
      ),
      listProducts: withErrorTracking('ProductService', 'ListProducts',
        productService.listProducts.bind(productService)
      )
    });

    this.server.addService(UserServiceDefinition, {
      createUser: withErrorTracking('UserService', 'CreateUser',
        userService.createUser.bind(userService)
      ),
      getUser: withErrorTracking('UserService', 'GetUser',
        userService.getUser.bind(userService)
      )
    });

    this.server.addService(OrderServiceDefinition, {
      createOrder: withErrorTracking('OrderService', 'CreateOrder',
        orderService.createOrder.bind(orderService)
      )
    });
  }

  private setupGracefulShutdown(): void {
    const shutdown = () => {
      logger.info('Received shutdown signal, gracefully shutting down...');
      
      this.server.tryShutdown((error) => {
        if (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        } else {
          logger.info('gRPC server shut down gracefully');
          process.exit(0);
        }
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// Start the server
async function main() {
  try {
    const config = new GrpcConfig();
    const server = new GrpcServer(config);
    await server.start();
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

### Production-Ready Error Handling Checklist

#### ✅ **Server-Side Checklist**

1. **Input Validation**
   - [ ] Validate all required fields
   - [ ] Check data types and formats
   - [ ] Implement business rule validation
   - [ ] Return structured error details

2. **Error Classification**
   - [ ] Use appropriate gRPC status codes
   - [ ] Don't expose internal implementation details
   - [ ] Provide actionable error messages
   - [ ] Include correlation IDs for tracking

3. **Logging and Monitoring**
   - [ ] Log all errors with context
   - [ ] Track error rates and patterns
   - [ ] Set up alerting for critical errors
   - [ ] Include request/response correlation

4. **Health Checks**
   - [ ] Implement gRPC health check service
   - [ ] Monitor external dependencies
   - [ ] Provide readiness and liveness probes
   - [ ] Handle graceful shutdown

#### ✅ **Client-Side Checklist**

1. **Error Handling**
   - [ ] Handle all relevant status codes
   - [ ] Implement appropriate retry logic
   - [ ] Provide user-friendly error messages
   - [ ] Log errors for debugging

2. **Resilience**
   - [ ] Set appropriate timeouts
   - [ ] Implement circuit breaker pattern
   - [ ] Handle service unavailability
   - [ ] Cache data when appropriate

3. **Monitoring**
   - [ ] Track client error rates
   - [ ] Monitor response times
   - [ ] Alert on high error rates
   - [ ] Implement distributed tracing

### Environment-Specific Configuration

```typescript
// src/config/grpc.config.ts
export class GrpcConfig {
  port: number;
  logLevel: string;
  enableMetrics: boolean;
  retryConfig: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };

  constructor() {
    this.port = parseInt(process.env.GRPC_PORT || '50051');
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableMetrics = process.env.ENABLE_METRICS === 'true';
    
    this.retryConfig = {
      maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
      baseDelayMs: parseInt(process.env.BASE_DELAY_MS || '100'),
      maxDelayMs: parseInt(process.env.MAX_DELAY_MS || '5000')
    };
  }
}

// Development vs Production configurations
const configs = {
  development: {
    debugMode: true,
    verboseLogging: true,
    mockExternalServices: true
  },
  production: {
    debugMode: false,
    verboseLogging: false,
    mockExternalServices: false,
    enableHealthCheck: true,
    enableMetrics: true
  }
};
```

### Testing Error Scenarios

```typescript
// tests/error-handling.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { status } from '@grpc/grpc-js';
import { ProductService } from '../src/services/product.service';

describe('gRPC Error Handling', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
  });

  it('should return INVALID_ARGUMENT for empty product ID', async () => {
    const mockCall = {
      request: { productId: '' },
      metadata: new Map(),
      getPeer: () => 'test-peer'
    };

    const callback = jest.fn();
    await productService.getProduct(mockCall as any, callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: status.INVALID_ARGUMENT,
        message: expect.stringContaining('Product ID is required')
      })
    );
  });

  it('should return NOT_FOUND for non-existent product', async () => {
    const mockCall = {
      request: { productId: 'non-existent' },
      metadata: new Map([['authorization', 'Bearer valid-token']]),
      getPeer: () => 'test-peer'
    };

    const callback = jest.fn();
    await productService.getProduct(mockCall as any, callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        code: status.NOT_FOUND,
        message: expect.stringContaining('not found')
      })
    );
  });

  // Add more test cases for different error scenarios
});
```

---

## Conclusion

Effective gRPC error handling in Node.js with TypeScript requires a systematic approach that covers:

1. **Understanding status codes** and when to use each one
2. **Implementing robust client-side error handling** with retry logic
3. **Creating meaningful server-side error responses** with proper validation
4. **Managing error propagation** across microservices
5. **Setting up comprehensive debugging and monitoring**

Remember: Good error handling isn't just about catching errors—it's about creating a system that fails gracefully, provides actionable feedback, and helps you diagnose issues quickly when they occur.

Start by implementing basic error handling patterns, then gradually add more sophisticated features like retry logic, circuit breakers, and comprehensive monitoring as your system grows. Your future self (and your on-call teammates) will thank you for the investment in proper error handling!
class AuthError extends Error {
  status: boolean;
  message: string;
  constructor(message: string) {
    super();
    this.message = message;
    this.status = false;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

const auth = (roles: string | string[], resolver: any) => {
  return (parent: any, args: any, context: any, info: any) => {
    const userRole = context?.user;
    if (typeof roles === "string") {
      if (roles !== userRole) {
        throw new AuthError("Not Authorized");
      }
    } else {
      if (!roles.includes(userRole)) {
        throw new AuthError("Not Authorized");
      }
    }

    return resolver(parent, args, context, info);
  };
};
export default auth;

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

const authChecker = (roleList: string | string[], context: any) => {
  const userRole = context.role;
  if (typeof roleList === "string") {
    if (roleList != userRole) {
      throw new AuthError(" Not Authorized");
    }
  } else {
    if (roleList.includes(userRole)) {
      throw new AuthError(" Not Authorized");
    }
  }
};

export default authChecker;

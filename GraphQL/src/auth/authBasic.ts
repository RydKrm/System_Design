import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface reqUser extends Request {
  user?: any;
}

const authenticateToken = (req: reqUser, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // * this line of code work after microservice works
    // const secret = process.env.JWT_SECRET as string;
    // const verifyToken = jwt.verify(token, secret);
    // console.log("auth header ", verifyToken);
    // if (verifyToken) {
    //   req.user = verifyToken;
    // } else {
    //   req.user = null;
    // }

    if (token === "manager1234") {
      req.user = "manager";
    } else {
      req.user = null;
    }
    next();
  } catch (error) {
    req.user = null;
    next();
  }

  // jwt.verify(token, secret, (err: any, user: any) => {
  //   if (err) {
  //     req.user = null;
  //   } else {
  //     req.user = user;
  //   }
  //   next();
  // });
};

export default authenticateToken;

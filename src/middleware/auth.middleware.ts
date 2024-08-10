import { NextFunction, Request, Response } from "express";
import CustomError from "../errors/customError";
import errorHandler from "../utils/errorHandler";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import CustomRequest from "../utils/customRequest";

const AuthMiddleware = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorization: token } = req.headers as { [key: string]: any };

    if (!token) {
      throw new CustomError("Unauthorized", 403);
    }

    jwt.verify(token.split(" ")[1], process.env.ENC_KEY!);

    const prismaToken = await prisma.userToken.findFirst({
      select: {
        userId: true,
      },
      where: {
        token: token.split(" ")[1],
      },
    });

    if (!prismaToken) {
      throw new CustomError(
        "Your session has expired! Please login again.",
        403
      );
    }

    req.userid = prismaToken.userId;

    next();
  } catch (error) {
    errorHandler(error, res);
  }
};

export default AuthMiddleware;

export const LowKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.query as Record<string, string>;

    // If the server low level key is not set, then the service is unavailable for this route
    if (typeof process.env.SERVER_LOW_LEVEL_KEY !== "string") {
      throw new CustomError("Service unavailable for this route!", 503);
    }

    // If the token is not provided or the token is not the same as the server low level key, then the user is unauthorized
    if (!token || process.env.SERVER_LOW_LEVEL_KEY !== token) {
      throw new CustomError("Unauthorized", 403);
    }

    // If the token is the same as the server low level key, then the user is authorized
    next();
  } catch (error) {
    errorHandler(error, res);
  }
};

import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime";
import { AxiosError } from "axios";
import { Response } from "express";
import { JsonWebTokenError } from "jsonwebtoken";
import { ZodError } from "zod";
import CustomError from "../errors/customError";
import Logger from "./logger";

const prismaClientSideErrorCodes = ["P2002", "P2025"];
const logger = new Logger("Error Handler");

const errorHandler = (error: any, res: Response) => {
  console.log(error);

  let message = "Something went wrong!";
  let status = 500;

  if (error instanceof AxiosError) {
    message = error.response?.data.message ?? error.message;
    status = error.response?.status ?? 500;
  }

  if (error instanceof JsonWebTokenError) {
    message = "Unauthorized";
    status = 403;
  }

  if (error instanceof CustomError) {
    message = error.message;
    status = error.status;
  }

  if (error instanceof ZodError) {
    message = `${error.errors[0].path}: ${error.errors[0].message}`;
    status = 400;
  }

  if (error instanceof PrismaClientKnownRequestError) {
    message = error.meta?.cause?.toString() ?? error.message;
    if (prismaClientSideErrorCodes.includes(error.code)) {
      status = 400;
    }
  }

  if (
    error instanceof PrismaClientUnknownRequestError ||
    error instanceof PrismaClientRustPanicError ||
    error instanceof PrismaClientInitializationError
  ) {
    message = error.message;
  }

  if (error instanceof PrismaClientValidationError) {
    message = error.message;
    status = 400;
  }

  if (status === 500) {
    logger.error(error);
  }
  // console.log(message)
  return res.status(status).json({
    message,
  });
};

export default errorHandler;

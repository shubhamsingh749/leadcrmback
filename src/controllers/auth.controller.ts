import bcrypt from "bcrypt";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import moment from "moment";
import CustomError from "../errors/customError";
import { LoginBody, RegisterBody } from "../routers/auth/body";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";
import Logger from "../utils/logger";
import getClientIP from "../utils/ip";

const logger = new Logger("Auth Controller");

export default class AuthController {
  /**
   * This function will look for user in database based on given username. If user is found, it will check if password is valid, after that, it will generate a new jwt token and store that token in database. After that, it will return basic user info along with token.
   */
  static async login(req: Request, res: Response) {
    try {
      const data = LoginBody.parse(req.body);
      logger.log(
        `[${getClientIP(req)}]: ${data.username} is attempting to login.`
      );
      const user = await prisma.user.findFirst({
        where: {
          username: data.username,
        },
      });

      if (!user || !(await bcrypt.compare(data.password, user.password))) {
        throw new CustomError("Invalid username or password", 401);
      }

      const token = jwt.sign(
        {
          name: user.name,
        },
        process.env.ENC_KEY!,
        {
          expiresIn: "12h",
        }
      );

      await prisma.userToken.create({
        data: {
          token,
          userId: user.id,
          expiringAt: moment().add(12, "hours").toDate(),
        },
      });

      logger.log(
        `[${getClientIP(req)}]: ${
          data.username
        } logged in with a new token "${token}".`
      );

      return res.json({
        name: user.name,
        token,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will add a user in database with given details and return basic info of created user.
   *
   * **Note**: This function does not work in production.
   */
  static async register(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === "production") {
        logger.log(
          `[${getClientIP(
            req
          )}]: Someone has attempted to register a user in production.`
        );
        throw new CustomError("Feature unavailable!", 403);
      }
      const data = RegisterBody.parse(req.body);
      const response = await prisma.user.create({
        data: {
          ...data,
          password: await bcrypt.hash(data.password, 10),
        },
        select: {
          name: true,
          username: true,
        },
      });

      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }
}

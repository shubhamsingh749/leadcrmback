import { Request, Response } from "express";
import CustomError from "../errors/customError";
import { CreateBranchBody, UpdateBranchBody } from "../routers/branch/body";
import errorHandler from "../utils/errorHandler";
import getClientIP from "../utils/ip";
import Logger from "../utils/logger";
import prisma from "../utils/prisma";

const logger = new Logger("Branch Controller");

export default class BranchController {
  /**
   * This function will return list of all branches available in database.
   */
  static async listAllBranches(req: Request, res: Response) {
    try {
      const response = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          ip: true,
          enabled: true,
          distribution: true,
          username: true,
          https: true,
          campaignName: true,
          listName: true,
          queueName: true,
        },
      });
      logger.log(
        `[${getClientIP(
          req
        )}]: A user has requested list of all branches using this token: "${
          req.headers.authorization
        }"`
      );
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will create a new branch in database and return it.
   */
  static async addBranch(req: Request, res: Response) {
    try {
      const branch = CreateBranchBody.parse(req.body);
      const response = await prisma.branch.create({
        data: branch,
      });
      logger.log(
        `[${getClientIP(
          req
        )}]: A user has added a branch in the database using this token: "${
          req.headers.authorization
        }". Added branch: ${JSON.stringify(branch)}`
      );
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will update branch information based on given branch id and return the updated branch.
   */
  static async updateBranch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const branch = UpdateBranchBody.parse(req.body);
      const response = await prisma.branch.update({
        data: branch,
        where: {
          id,
        },
      });
      logger.log(
        `[${getClientIP(
          req
        )}]: A user has updated a branch (Branch Id: ${id}) in the database using this token: "${
          req.headers.authorization
        }". Updated branch: ${JSON.stringify(branch)}`
      );
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * **(DO NOT USE IN PRODUCTION)**
   *
   * This function will safe delete a branch. Though, it is not meant to be used in production.
   *
   * **Safe Delete**
   *
   * Safe delete is basically updating the value of deletedAt timestamp in database.
   */
  static async deleteBranch(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === "production") {
        logger.log(
          `[${getClientIP(
            req
          )}]: Someone has attempted to delete a branch in production using token ${
            req.headers.authorization
          }!`
        );
        throw new CustomError("This feature is not available.", 503);
      }
      const { id } = req.params;
      const response = await prisma.branch.update({
        data: {
          deleted: new Date(),
        },
        where: {
          id,
        },
        select: {
          deleted: true,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }
}

import { Request, Response } from "express";
import { CreateProductBody, UpdateProductBody } from "../routers/product/body";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";

export default class ProductController {
  /**
   * This function will return all the products available in the database.
   */
  static async listAllProduct(_: Request, res: Response) {
    try {
      const response = await prisma.product.findMany();
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will add a product in database and return it.
   */
  static async addProduct(req: Request, res: Response) {
    try {
      const body = CreateProductBody.parse(req.body);
      const response = await prisma.product.create({
        data: body,
      });

      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will update product based on given product id and return updated product.
   */
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = UpdateProductBody.parse(req.body);
      const response = await prisma.product.update({
        data: body,
        where: {
          id,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will delete a product based on given product id and return deleted product.
   */
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const response = await prisma.product.delete({
        where: {
          id,
        },
      });
      return res.json(response);
    } catch (error) {
      errorHandler(error, res);
    }
  }
}

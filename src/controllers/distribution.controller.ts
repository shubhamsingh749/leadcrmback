import { Request, Response } from "express";
import { CreateDistributionBody } from "../routers/distribution/body";
import errorHandler from "../utils/errorHandler";
import prisma from "../utils/prisma";
import { DataGridColumn } from "../routers/report/types";

export default class DistributionController {
  /**
   * This function finds out the distribution of products in all the available branches. Basically, it tells you how many percent of leads of a product will go in which branche.
   */
  static async listDistribution(_: Request, res: Response) {
    try {
      const branches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      const columns: DataGridColumn[] = [
        {
          field: "name",
          headerName: "Product",
          minWidth: 200,
          flex: 1,
        },
      ];
      columns.push(
        ...branches.map<DataGridColumn>((e: any) => {
          return {
            field: e.id,
            headerName: e.name,
            width: 150,
            type: "number",
          };
        })
      );

      const distribution = await prisma.product.findMany({
        select: {
          name: true,
          id: true,
          ProductDistribution: {
            select: {
              branch: {
                select: {
                  id: true,
                  name: true,
                },
              },
              distribution: true,
            },
          },
        },
      });

      const rows: any[] = [];
      console.log("distribution", distribution);
      rows.push(
        ...distribution.map((e: any) => {
          const d: any = {
            id: e.id,
            name: e.name,
          };
          e.ProductDistribution.map((f: any) => {
            d[f.branch.id] = f.distribution;
          });
          return d;
        })
      );

      return res.json({
        columns,
        rows,
      });
    } catch (error) {
      errorHandler(error, res);
    }
  }

  /**
   * This function will check if distribution of a product for given branch exists or not. If it does, this function will update the distribution else it will create a new distribution in database with given information.
   */
  static async upsertDistribution(req: Request, res: Response) {
    try {
      const body = CreateDistributionBody.parse(req.body);
      console.log(body);
      let distributionExist = await prisma.productDistribution.findFirst({
        select: {
          id: true,
        },
        where: {
          AND: {
            branchId: body.branchId,
            productId: body.productId,
          },
        },
      });

      if (distributionExist) {
        const response = await prisma.productDistribution.update({
          data: {
            distribution: body.distribution,
          },
          where: {
            id: distributionExist!.id,
          },
        });
        return res.json(response);
      } else {
        const response = await prisma.productDistribution.create({
          data: body,
        });
        return res.json(response);
      }
    } catch (error) {
      errorHandler(error, res);
    }
  }
}

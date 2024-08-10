import { Product } from "@prisma/client";
import joi, { ValidationResult } from "joi";

interface ExcelObject {
  form_id: number;
  full_name: string;
  mobile_one: number;
  address?: string;
  language: string;
  product: string;
}

export const CreateLeadBody = ({
  products,
  body,
}: {
  products: Product[];
  body: any;
}): ValidationResult<ExcelObject[]> => {
  const innerValidator = joi.object<ExcelObject>({
    full_name: joi.string().trim().min(1).required(),
    mobile_one: joi
      .number()
      .required()
      .custom((value, helper) => {
        let rValue = String(value);

        if (
          !(
            rValue.startsWith("9") ||
            rValue.startsWith("8") ||
            rValue.startsWith("7") ||
            rValue.startsWith("6")
          )
        ) {
          return helper.message(
            "Mobile number should start with 9,8,7 or 6" as any
          );
        }

        if (rValue.length !== 10) {
          return helper.message(
            "Mobile number should be 10 digits long" as any
          );
        }

        return value;
      }),
    address: joi.string().trim().default(""),
    language: joi.string().trim().required(),
    product: joi
      .string()
      .trim()
      .required()
      .valid(...(products?.map((p) => p.name) ?? [])),
  });

  const validator = joi.array().items(innerValidator).label("Leads");

  return validator.validate(body, {
    abortEarly: true,
  });
};

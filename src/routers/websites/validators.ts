import { body } from "express-validator";

export const mainPatch = [
  body("name").isString().withMessage("Name must be a string"),
  body("url").isURL().withMessage("A valid url of website is required"),
  body("token")
    .exists({ checkFalsy: true })
    .withMessage("An access token of the website is required"),
  body("autoSync")
    .isBoolean()
    .withMessage("Auto sync value must be either true or false"),
];

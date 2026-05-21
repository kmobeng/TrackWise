import type { Application } from "express";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

const swaggerPath = path.join(__dirname, "../../swagger.yaml");
const swaggerDocument = yaml.load(
  fs.readFileSync(swaggerPath, "utf8"),
) as Record<string, unknown>;

export const setupSwagger = (app: Application) => {
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};

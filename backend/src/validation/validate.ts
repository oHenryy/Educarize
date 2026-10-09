import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";
import { sendError } from "../utils/httpError";

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/**
 * Valida e normaliza body/query/params. Campos desconhecidos do corpo são descartados,
 * então os controllers só recebem o que o schema declara.
 */
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      next();
    } catch (error) {
      sendError(res, error);
    }
  };
}

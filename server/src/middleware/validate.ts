import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * Validates req.body against a Zod schema and replaces body with parsed output.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (e) {
      next(e);
    }
  };
}

/**
 * Validates merged query + params (useful for GET with query strings).
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      (req as Request & { validatedQuery: unknown }).validatedQuery = schema.parse({
        ...req.query,
        ...req.params,
      });
      next();
    } catch (e) {
      next(e);
    }
  };
}

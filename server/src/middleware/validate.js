import { ValidationError } from '../utils/errors/index.js';

const SOURCES = ['params', 'query', 'body'];

/**
 * Validates request parts against zod schemas, e.g. `validate({ body: loginSchema })`.
 * Parsed values land on `req.valid`; the raw request is left untouched because
 * Express 5 exposes `req.query` as a read-only getter.
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const valid = {};
    const issues = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;
      const result = schema.safeParse(req[source]);
      if (result.success) {
        valid[source] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            source,
            path: issue.path.join('.'),
            message: issue.message,
          })),
        );
      }
    }

    if (issues.length > 0) return next(new ValidationError(undefined, issues));
    req.valid = valid;
    return next();
  };
}

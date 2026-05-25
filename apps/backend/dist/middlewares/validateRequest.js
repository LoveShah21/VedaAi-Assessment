"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            req.body = parsed.body;
            req.query = parsed.query;
            req.params = parsed.params;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: error.errors.map((err) => ({
                        field: err.path.slice(1).join('.') || err.path.join('.'),
                        message: err.message,
                    })),
                });
                return;
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;

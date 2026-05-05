const { z } = require("zod");
const ErrorHandler = require("../../utils/errorHandler.util");

const zodyCredentialValidator = (zodSchema) => async (req, res, next) => {
  try {
    const parsedData = await zodSchema.parseAsync(req.body);
    req.body = parsedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const zodError = {
        msg: issue.message,
        path: issue.path,
        code: issue.code === "custom" ? "special char missing" : issue.code,
      };

      return new ErrorHandler(400, zodError).log("zodError", zodError).send(res);
    }

    return new ErrorHandler(500, "Internal zod Validation failure")
      .log("validation error", error)
      .send(res);
  }
};

module.exports = zodyCredentialValidator;

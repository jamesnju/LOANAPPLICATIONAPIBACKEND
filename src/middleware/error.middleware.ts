import type {
  Request,
  Response,
  NextFunction,
} from "express";

export function notFoundHandler(
  req: Request,
  res: Response,
) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(
    "[ERROR]",
    error,
  );

  if (res.headersSent) {
    next(error);
    return;
  }

  const message =
    error instanceof Error
      ? error.message
      : "Internal server error";

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV ===
      "production"
        ? "Internal server error"
        : message,
  });
}
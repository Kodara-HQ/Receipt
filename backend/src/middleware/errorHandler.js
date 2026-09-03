export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "That image is too large. Please use a file under 2MB." });
  }

  const status = err.status || 500;
  const message = err.message || "Something went wrong. Please try again.";

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: message,
  });
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

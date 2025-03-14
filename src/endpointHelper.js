const metrics = require('./metrics.js');

class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  const start = performance.now();
  return Promise.resolve(fn(req, res, next)).catch(next).finally(() => {
    const end = performance.now();
    metrics.trackLatency('endpoint', end - start);
  });
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};

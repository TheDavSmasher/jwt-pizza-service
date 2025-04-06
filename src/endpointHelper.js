const metrics = require('./metrics.js');
const logger = require('./logging.js');

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
    const time = end - start;
    metrics.trackLatency('endpoint', time);
    if (time > 150) {
      logger.latencyLogger(time, req.originalUrl);
    }
  });
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};

const config = require('./config');
const metrics = require("./metrics");

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        req: JSON.stringify(req.body),
        res: JSON.stringify(resBody),
      };
      const level = this._statusToLogLevel(res.statusCode);
      this._log(level, 'http', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  dbLogger(query) {
    this._log('info', 'db', { req: query });
  }

  factoryLogger(reqBody, resBody, statusCode) {
    const logData = {
      statusCode: statusCode,
      req: JSON.stringify(reqBody),
      res: JSON.stringify(resBody)
    };
    const level = this._statusToLogLevel(statusCode);
    this._log(level, 'factory', logData);
  }

  errorLogger(err) {
    this._log('error', 'server', { message: err.message, stack: err.stack })
  }

  latencyLogger(time, path) {
    this._log('warn', 'server', { time: time, endpoint: path })
  }

  _log(level, type, logData) {
    metrics.trackLogs(level);
    const labels = { component: config.logging.source, level: level, type: type };
    const values = [this._nowString(), this._sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this._sendLogToGrafana(logEvent);
  }

  _statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  _nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  _sanitize(logData) {
    logData = JSON.stringify(logData);
    return logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
  }

  _sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    }).then((res) => {
      if (!res.ok) console.log('Failed to send log to Grafana');
    });
  }
}

module.exports = new Logger();
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, stack, ...meta }) => {
            let log = `${timestamp} [${level}] ${stack || message}`;

            if (Object.keys(meta).length > 0) {
              log += `\n${JSON.stringify(meta, null, 2)}`;
            }

            return log;
          }
        )
      ),
    }),
  ],
});

module.exports = logger;

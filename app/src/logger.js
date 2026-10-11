const winston = require("winston");
const LokiTransport = require("winston-loki");

const lokiHost = process.env.LOKI_HOST || "http://loki:3100";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new LokiTransport({
      host: lokiHost,
      labels: { app: "node-monitoring-demo" },
      json: true,
      replaceTimestamp: true,
      onConnectionError: (err) => console.error("Loki connection error:", err.message),
    }),
  ],
});

module.exports = logger;

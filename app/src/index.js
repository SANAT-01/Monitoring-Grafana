const express = require("express");
const { register, metricsMiddleware } = require("./metrics");
const routes = require("./routes");
const logger = require("./logger");

const app = express();
const port = process.env.PORT || 3000;

app.use(metricsMiddleware);
app.use(routes);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

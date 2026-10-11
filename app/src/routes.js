const express = require("express");
const logger = require("./logger");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/slow", async (req, res) => {
  const delayMs = Math.floor(Math.random() * 2900) + 100; // 100ms - 3000ms
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  logger.info("served /slow", { route: "/slow", delayMs });
  res.status(200).json({ message: "slow response", delayMs });
});

router.get("/fetch-data", (req, res) => {
  const outcomes = [
    { status: 200, weight: 70 },
    { status: 404, weight: 10 },
    { status: 400, weight: 8 },
    { status: 500, weight: 8 },
    { status: 503, weight: 4 },
  ];

  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = outcomes[0];
  for (const outcome of outcomes) {
    if (roll < outcome.weight) {
      chosen = outcome;
      break;
    }
    roll -= outcome.weight;
  }

  if (chosen.status >= 500) {
    logger.error("fetch-data failed", { route: "/fetch-data", status: chosen.status });
  } else if (chosen.status >= 400) {
    logger.warn("fetch-data client error", { route: "/fetch-data", status: chosen.status });
  } else {
    logger.info("fetch-data ok", { route: "/fetch-data", status: chosen.status });
  }

  res.status(chosen.status).json({ status: chosen.status, data: chosen.status === 200 ? { id: 1, value: "sample" } : null });
});

module.exports = router;

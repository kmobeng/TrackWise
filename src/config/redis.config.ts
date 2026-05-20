import Redis from "ioredis"
import logger from "./winston.config";

// redis connection
export const RedisClient = new Redis(process.env.REDIS_URL!);

RedisClient.on("error", (err) => {
  logger.error("Redis error", err);
});

RedisClient.on("connect", () => {
  logger.info("Connected to redis");
});
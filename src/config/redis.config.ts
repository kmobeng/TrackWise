import Redis from "ioredis";
import logger from "./winston.config";
import { REDIS_ENABLED } from "./features.config";

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: string,
    duration?: number,
  ): Promise<unknown>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

const noopRedis: RedisLike = {
  async get() {
    return null;
  },
  async set() {
    return undefined;
  },
  async setex() {
    return undefined;
  },
  async del() {
    return undefined;
  },
};

export const RedisClient: RedisLike = (() => {
  if (!REDIS_ENABLED) {
    logger.warn("REDIS_ENABLED=false: Redis disabled, using no-op client");
    return noopRedis;
  }

  const client = new Redis(process.env.REDIS_URL!);

  client.on("error", (err) => {
    logger.error("Redis error", err);
  });

  client.on("connect", () => {
    logger.info("Connected to redis");
  });

  return client as unknown as RedisLike;
})();
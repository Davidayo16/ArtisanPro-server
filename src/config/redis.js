import Redis from "ioredis";

let redisClient;

export const connectRedis = () => {
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: process.env.REDIS_PORT || 6379,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis Connected".cyan.bold);
    });

    redisClient.on("error", (err) => {
      console.error(`❌ Redis Error: ${err}`.red);
    });

    return redisClient;
  } catch (error) {
    console.error(`❌ Redis Connection Failed: ${error.message}`.red);
    return null;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = connectRedis();
  }
  return redisClient;
};

// lib/redis.ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Acquire a Redis lock. Returns true if acquired, false otherwise.
export async function acquireLock(
  key: string,
  ttlMs: number = 5000
): Promise<boolean> {
  const result = await redis.set(key, "1", {
    nx: true,
    px: ttlMs,
  });
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  await redis.del(key);
}

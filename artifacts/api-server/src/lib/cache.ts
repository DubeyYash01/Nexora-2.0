import NodeCache from "node-cache";
import type { Request, Response, NextFunction } from "express";

const cache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false,
});

export function cacheMiddleware(ttl: number = 600) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = (data: unknown) => {
      if (res.statusCode === 200) {
        cache.set(key, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
}

export { cache };

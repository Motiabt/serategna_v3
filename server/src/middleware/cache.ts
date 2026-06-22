import { Request, Response, NextFunction } from 'express';

/**
 * Set Cache-Control on safe, static GET responses so browsers and a CDN can
 * cache them (catalog/taxonomy, enterprise marketing data). Only applies to GET;
 * never caches authenticated, per-user data. At scale this pairs with a CDN and
 * an optional Redis response cache (see docs/SCALING.md).
 */
export function cacheControl(seconds: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${Math.round(seconds / 2)}`);
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  };
}

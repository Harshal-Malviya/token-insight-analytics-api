import { Request, Response, NextFunction } from 'express';
import { CoinGeckoError } from '../services/coingecko.service';
import { HyperLiquidError } from '../services/hyperliquid.service';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (err instanceof CoinGeckoError) {
    res.status(err.statusCode).json({
      error: 'CoinGecko API Error',
      message: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  if (err instanceof HyperLiquidError) {
    res.status(err.statusCode).json({
      error: 'HyperLiquid API Error',
      message: err.message,
      statusCode: err.statusCode
    });
    return;
  }

  res.status(statusCode).json({
    error: err.name || 'API Error',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

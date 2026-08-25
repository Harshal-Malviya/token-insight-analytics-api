import { Request, Response, NextFunction } from 'express';
import { fetchHyperLiquidPnL } from '../services/hyperliquid.service';

export async function getHyperLiquidPnLHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { wallet } = req.params;
    const start = req.query.start as string;
    const end = req.query.end as string;

    const pnlData = await fetchHyperLiquidPnL(wallet, start, end);

    res.status(200).json(pnlData);
  } catch (error) {
    next(error);
  }
}

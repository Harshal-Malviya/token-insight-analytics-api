import { Request, Response, NextFunction } from 'express';
import { fetchCoinData } from '../services/coingecko.service';
import { generateTokenInsight } from '../services/ai/ai.service';

export async function getTokenInsightHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const vsCurrency = (req.body?.vs_currency || 'usd').toLowerCase();
    const historyDays = req.body?.history_days ? Number(req.body.history_days) : 30;

    // 1. Fetch token metadata + market data from CoinGecko
    const tokenData = await fetchCoinData(id, vsCurrency, historyDays);

    // 2. Build prompt & call AI provider for structured insight
    const { insight, model } = await generateTokenInsight(tokenData);

    // 3. Construct and return exact response shape
    res.status(200).json({
      source: 'coingecko',
      token: {
        id: tokenData.id,
        symbol: tokenData.symbol,
        name: tokenData.name,
        market_data: {
          current_price_usd: tokenData.market_data.current_price_usd,
          market_cap_usd: tokenData.market_data.market_cap_usd,
          total_volume_usd: tokenData.market_data.total_volume_usd,
          price_change_percentage_24h: tokenData.market_data.price_change_percentage_24h
        }
      },
      insight,
      model
    });
  } catch (error) {
    next(error);
  }
}

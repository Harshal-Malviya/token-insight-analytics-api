import axios from 'axios';
import { config } from '../config/env';
import { withRetry } from '../utils/retry';

export interface CoinGeckoTokenData {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price_usd: number;
    market_cap_usd: number;
    total_volume_usd: number;
    price_change_percentage_24h: number;
  };
  history?: Array<{ timestamp: number; price: number }>;
}

export class CoinGeckoError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'CoinGeckoError';
    this.statusCode = statusCode;
  }
}

export async function fetchCoinData(
  tokenId: string,
  vsCurrency = 'usd',
  historyDays = 30
): Promise<CoinGeckoTokenData> {
  const currencyKey = vsCurrency.toLowerCase();

  const fetchTokenDetail = async () => {
    try {
      const url = `${config.coingeckoApiUrl}/coins/${encodeURIComponent(tokenId)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
      const response = await axios.get(url, {
        headers: { Accept: 'application/json' },
        timeout: 8000
      });

      const data = response.data;
      const marketData = data.market_data || {};

      const currentPrice = marketData.current_price?.[currencyKey] ?? marketData.current_price?.usd ?? 0;
      const marketCap = marketData.market_cap?.[currencyKey] ?? marketData.market_cap?.usd ?? 0;
      const totalVolume = marketData.total_volume?.[currencyKey] ?? marketData.total_volume?.usd ?? 0;
      const priceChange24h = marketData.price_change_percentage_24h ?? 0;

      const tokenData: CoinGeckoTokenData = {
        id: data.id || tokenId,
        symbol: (data.symbol || '').toLowerCase(),
        name: data.name || tokenId,
        market_data: {
          current_price_usd: Number(currentPrice),
          market_cap_usd: Number(marketCap),
          total_volume_usd: Number(totalVolume),
          price_change_percentage_24h: Number(priceChange24h)
        }
      };
      return tokenData;
    } catch (err: any) {
      if (err.response) {
        if (err.response.status === 404) {
          throw new CoinGeckoError(`Token '${tokenId}' not found on CoinGecko`, 404);
        }
        if (err.response.status === 429) {
          throw new CoinGeckoError('CoinGecko API rate limit exceeded. Please try again later.', 429);
        }
        throw new CoinGeckoError(
          `CoinGecko API error: ${err.response.data?.error || err.response.statusText}`,
          err.response.status
        );
      }
      throw new CoinGeckoError(`Failed to reach CoinGecko: ${err.message}`, 502);
    }
  };

  // Retry up to 2 times for transient network/429 errors (excluding 404)
  const tokenData = await withRetry(fetchTokenDetail, {
    maxRetries: 2,
    initialDelayMs: 600,
    shouldRetry: (error) => !(error instanceof CoinGeckoError && error.statusCode === 404)
  });

  // Optionally fetch historical price chart data
  try {
    const chartUrl = `${config.coingeckoApiUrl}/coins/${encodeURIComponent(tokenId)}/market_chart?vs_currency=${currencyKey}&days=${historyDays}`;
    const chartRes = await axios.get(chartUrl, { timeout: 5000 });
    if (chartRes.data && Array.isArray(chartRes.data.prices)) {
      tokenData.history = chartRes.data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price
      }));
    }
  } catch (chartErr) {
    // History is optional; proceed gracefully if history call fails
  }

  return tokenData;
}

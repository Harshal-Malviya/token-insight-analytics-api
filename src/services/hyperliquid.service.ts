import axios from 'axios';
import { config } from '../config/env';
import { withRetry } from '../utils/retry';
import {
  calculateDailyPnL,
  HyperLiquidFill,
  HyperLiquidFunding,
  HyperLiquidPosition,
  DailyPnLResult,
  PnLSummaryResult
} from './pnl.calculator';

export class HyperLiquidError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HyperLiquidError';
    this.statusCode = statusCode;
  }
}

export interface HyperLiquidPnLResponse {
  wallet: string;
  start: string;
  end: string;
  daily: DailyPnLResult[];
  summary: PnLSummaryResult;
  diagnostics: {
    data_source: string;
    last_api_call: string;
    notes: string;
  };
}

export async function fetchHyperLiquidPnL(
  wallet: string,
  startDateStr: string,
  endDateStr: string
): Promise<HyperLiquidPnLResponse> {
  const normalizedWallet = wallet.toLowerCase();
  const startTime = new Date(`${startDateStr}T00:00:00.000Z`).getTime();
  const endTime = new Date(`${endDateStr}T23:59:59.999Z`).getTime();

  let fills: HyperLiquidFill[] = [];
  let fundingHistory: HyperLiquidFunding[] = [];
  let positions: HyperLiquidPosition[] = [];
  let initialEquity = 10000;

  const fetchApiData = async () => {
    try {
      // 1. Fetch user fills / trades
      const fillsRes = await axios.post(
        config.hyperliquidApiUrl,
        { type: 'userFillsByTime', user: normalizedWallet, startTime, endTime },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );
      if (Array.isArray(fillsRes.data)) {
        fills = fillsRes.data;
      } else {
        // Try fallback to userFills
        const fillsFallback = await axios.post(
          config.hyperliquidApiUrl,
          { type: 'userFills', user: normalizedWallet },
          { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
        );
        if (Array.isArray(fillsFallback.data)) {
          fills = fillsFallback.data;
        }
      }

      // 2. Fetch user funding payments
      const fundingRes = await axios.post(
        config.hyperliquidApiUrl,
        { type: 'userFunding', user: normalizedWallet, startTime, endTime },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );
      if (Array.isArray(fundingRes.data)) {
        fundingHistory = fundingRes.data;
      }

      // 3. Fetch clearinghouse state for current positions & account value
      const stateRes = await axios.post(
        config.hyperliquidApiUrl,
        { type: 'clearinghouseState', user: normalizedWallet },
        { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
      );

      if (stateRes.data) {
        const marginSummary = stateRes.data.marginSummary;
        if (marginSummary?.accountValue) {
          const accVal = parseFloat(String(marginSummary.accountValue));
          if (!isNaN(accVal) && accVal > 0) {
            initialEquity = accVal;
          }
        }

        const assetPositions = stateRes.data.assetPositions;
        if (Array.isArray(assetPositions)) {
          positions = assetPositions
            .map((item: any) => item?.position)
            .filter((pos: any) => pos && pos.coin);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 400) {
        throw new HyperLiquidError(`Invalid wallet address or payload for HyperLiquid: ${wallet}`, 400);
      }
      if (err.response?.status === 429) {
        throw new HyperLiquidError('HyperLiquid API rate limit reached. Please try again later.', 429);
      }
      // For network errors or unexpected status, rethrow to retry or fallback
      throw err;
    }
  };

  try {
    await withRetry(fetchApiData, {
      maxRetries: 1,
      initialDelayMs: 500,
      shouldRetry: (err) => !(err instanceof HyperLiquidError && err.statusCode === 400)
    });
  } catch (err: any) {
    if (err instanceof HyperLiquidError) {
      throw err;
    }
    // Log and continue with zero-filled calculation if API is unavailable or wallet has no records
  }

  // Execute pure PnL calculation engine
  const { daily, summary } = calculateDailyPnL({
    wallet: normalizedWallet,
    startDateStr,
    endDateStr,
    fills,
    fundingHistory,
    positions,
    initialEquity
  });

  return {
    wallet: normalizedWallet,
    start: startDateStr,
    end: endDateStr,
    daily,
    summary,
    diagnostics: {
      data_source: 'hyperliquid_api',
      last_api_call: new Date().toISOString(),
      notes: 'PnL calculated using daily close prices and user fill/funding history'
    }
  };
}

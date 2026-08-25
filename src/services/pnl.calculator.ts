import { generateDateRange, formatTimestampToDate } from '../utils/dateUtils';

export interface HyperLiquidFill {
  closedPnl?: string | number;
  fee?: string | number;
  feeToken?: string;
  time: number;
  coin?: string;
  dir?: string;
  px?: string | number;
  sz?: string | number;
}

export interface HyperLiquidFunding {
  time: number;
  usdc?: string | number;
  fundingRate?: string | number;
  szi?: string | number;
  coin?: string;
  delta?: {
    usdc?: string | number;
    type?: string;
  };
}

export interface HyperLiquidPosition {
  coin: string;
  szi: string | number; // position size (positive = long, negative = short)
  entryPx: string | number;
  positionValue?: string | number;
  unrealizedPnl?: string | number;
}

export interface DailyPnLResult {
  date: string;
  realized_pnl_usd: number;
  unrealized_pnl_usd: number;
  fees_usd: number;
  funding_usd: number;
  net_pnl_usd: number;
  equity_usd: number;
}

export interface PnLSummaryResult {
  total_realized_usd: number;
  total_unrealized_usd: number;
  total_fees_usd: number;
  total_funding_usd: number;
  net_pnl_usd: number;
}

export interface CalculatePnLOptions {
  wallet: string;
  startDateStr: string;
  endDateStr: string;
  fills: HyperLiquidFill[];
  fundingHistory: HyperLiquidFunding[];
  positions?: HyperLiquidPosition[];
  initialEquity?: number;
  markPricesByDay?: Record<string, Record<string, number>>; // date -> coin -> markPrice
}

/**
 * Pure calculator function to aggregate daily HyperLiquid PnL metrics.
 */
export function calculateDailyPnL(options: CalculatePnLOptions): {
  daily: DailyPnLResult[];
  summary: PnLSummaryResult;
} {
  const {
    startDateStr,
    endDateStr,
    fills,
    fundingHistory,
    positions = [],
    initialEquity = 10000,
    markPricesByDay = {}
  } = options;

  const dateList = generateDateRange(startDateStr, endDateStr);

  // Group fills by date
  const fillsByDate: Record<string, HyperLiquidFill[]> = {};
  for (const fill of fills) {
    const dateStr = formatTimestampToDate(fill.time);
    if (!fillsByDate[dateStr]) fillsByDate[dateStr] = [];
    fillsByDate[dateStr].push(fill);
  }

  // Group funding by date
  const fundingByDate: Record<string, HyperLiquidFunding[]> = {};
  for (const item of fundingHistory) {
    const dateStr = formatTimestampToDate(item.time);
    if (!fundingByDate[dateStr]) fundingByDate[dateStr] = [];
    fundingByDate[dateStr].push(item);
  }

  // Helper to round to 2 decimal places cleanly
  const r2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const dailyResults: DailyPnLResult[] = [];
  let runningEquity = initialEquity;

  for (let i = 0; i < dateList.length; i++) {
    const dateStr = dateList[i];
    const isLastDay = i === dateList.length - 1;

    // 1. Realized PnL from trades on this day
    const dayFills = fillsByDate[dateStr] || [];
    let dayRealizedPnl = 0;
    let dayFees = 0;

    for (const fill of dayFills) {
      const closedPnl = parseFloat(String(fill.closedPnl || 0));
      const fee = parseFloat(String(fill.fee || 0));
      dayRealizedPnl += isNaN(closedPnl) ? 0 : closedPnl;
      dayFees += isNaN(fee) ? 0 : fee;
    }

    // 2. Funding payments on this day
    const dayFundingList = fundingByDate[dateStr] || [];
    let dayFunding = 0;

    for (const fund of dayFundingList) {
      // In HyperLiquid API, funding amount in USDC can be fund.usdc or fund.delta.usdc
      let usdcVal = fund.usdc ?? fund.delta?.usdc ?? 0;
      const numVal = parseFloat(String(usdcVal));
      dayFunding += isNaN(numVal) ? 0 : numVal;
    }

    // 3. Mark-to-market Unrealized PnL
    let dayUnrealizedPnl = 0;

    if (positions.length > 0) {
      const dayMarkPrices = markPricesByDay[dateStr];
      
      for (const pos of positions) {
        const size = parseFloat(String(pos.szi || 0));
        const entryPx = parseFloat(String(pos.entryPx || 0));
        
        if (size === 0) continue;

        if (dayMarkPrices && dayMarkPrices[pos.coin]) {
          const markPx = dayMarkPrices[pos.coin];
          // Long: (mark - entry) * size; Short: (entry - mark) * abs(size)
          dayUnrealizedPnl += (markPx - entryPx) * size;
        } else if (isLastDay && pos.unrealizedPnl !== undefined) {
          // Fall back to current reported position unrealized PnL for last day if mark price absent
          const unPnl = parseFloat(String(pos.unrealizedPnl));
          dayUnrealizedPnl += isNaN(unPnl) ? 0 : unPnl;
        }
      }
    }

    // Round daily components
    dayRealizedPnl = r2(dayRealizedPnl);
    dayUnrealizedPnl = r2(dayUnrealizedPnl);
    dayFees = r2(dayFees);
    dayFunding = r2(dayFunding);

    // net_pnl_usd = realized + unrealized - fees + funding
    const netPnl = r2(dayRealizedPnl + dayUnrealizedPnl - dayFees + dayFunding);

    runningEquity = r2(runningEquity + netPnl);

    dailyResults.push({
      date: dateStr,
      realized_pnl_usd: dayRealizedPnl,
      unrealized_pnl_usd: dayUnrealizedPnl,
      fees_usd: dayFees,
      funding_usd: dayFunding,
      net_pnl_usd: netPnl,
      equity_usd: runningEquity
    });
  }

  // Summary aggregation
  const totalRealized = r2(dailyResults.reduce((acc, d) => acc + d.realized_pnl_usd, 0));
  // Total unrealized represents the mark-to-market position state at end of range
  const totalUnrealized = dailyResults.length > 0 ? dailyResults[dailyResults.length - 1].unrealized_pnl_usd : 0;
  const totalFees = r2(dailyResults.reduce((acc, d) => acc + d.fees_usd, 0));
  const totalFunding = r2(dailyResults.reduce((acc, d) => acc + d.funding_usd, 0));
  const summaryNetPnl = r2(totalRealized + totalUnrealized - totalFees + totalFunding);

  return {
    daily: dailyResults,
    summary: {
      total_realized_usd: totalRealized,
      total_unrealized_usd: totalUnrealized,
      total_fees_usd: totalFees,
      total_funding_usd: totalFunding,
      net_pnl_usd: summaryNetPnl
    }
  };
}

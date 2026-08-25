import { calculateDailyPnL } from '../../src/services/pnl.calculator';
import { generateDateRange, isValidDateString, formatTimestampToDate } from '../../src/utils/dateUtils';

describe('PnL Calculator & Date Utils', () => {
  describe('dateUtils', () => {
    it('should generate an inclusive list of date strings', () => {
      const dates = generateDateRange('2025-08-01', '2025-08-03');
      expect(dates).toEqual(['2025-08-01', '2025-08-02', '2025-08-03']);
    });

    it('should validate YYYY-MM-DD date strings correctly', () => {
      expect(isValidDateString('2025-08-01')).toBe(true);
      expect(isValidDateString('2025-02-30')).toBe(false);
      expect(isValidDateString('invalid-date')).toBe(false);
    });

    it('should format timestamps to UTC date strings', () => {
      // 1754006400000 -> 2025-08-01T00:00:00.000Z
      const dateStr = formatTimestampToDate(1754006400000);
      expect(dateStr).toBe('2025-08-01');
    });
  });

  describe('calculateDailyPnL', () => {
    it('should correctly calculate daily PnL, net PnL, equity and summary for trade fills and funding', () => {
      const fills = [
        {
          time: new Date('2025-08-01T10:00:00Z').getTime(),
          closedPnl: '120.5',
          fee: '2.1'
        },
        {
          time: new Date('2025-08-02T14:30:00Z').getTime(),
          closedPnl: '50.0',
          fee: '1.2'
        }
      ];

      const fundingHistory = [
        {
          time: new Date('2025-08-01T12:00:00Z').getTime(),
          usdc: '-0.5'
        },
        {
          time: new Date('2025-08-03T08:00:00Z').getTime(),
          usdc: '-0.3'
        }
      ];

      const positions = [
        {
          coin: 'ETH',
          szi: '1.0',
          entryPx: '3000',
          unrealizedPnl: '-15.3'
        }
      ];

      const result = calculateDailyPnL({
        wallet: '0xabc1234567890123456789012345678901234567',
        startDateStr: '2025-08-01',
        endDateStr: '2025-08-03',
        fills,
        fundingHistory,
        positions,
        initialEquity: 10000
      });

      expect(result.daily).toHaveLength(3);

      // Day 1: 2025-08-01
      // realized = 120.5, unrealized = 0, fees = 2.1, funding = -0.5
      // net = 120.5 + 0 - 2.1 + (-0.5) = 117.9
      // equity = 10000 + 117.9 = 10117.9
      expect(result.daily[0]).toMatchObject({
        date: '2025-08-01',
        realized_pnl_usd: 120.5,
        fees_usd: 2.1,
        funding_usd: -0.5,
        net_pnl_usd: 117.9,
        equity_usd: 10117.9
      });

      // Day 2: 2025-08-02
      // realized = 50.0, fees = 1.2, funding = 0
      // net = 50.0 - 1.2 = 48.8
      // equity = 10117.9 + 48.8 = 10166.7
      expect(result.daily[1]).toMatchObject({
        date: '2025-08-02',
        realized_pnl_usd: 50.0,
        fees_usd: 1.2,
        funding_usd: 0,
        net_pnl_usd: 48.8,
        equity_usd: 10166.7
      });

      // Day 3 (last day): 2025-08-03
      // realized = 0, unrealized = -15.3, fees = 0, funding = -0.3
      // net = 0 + (-15.3) - 0 + (-0.3) = -15.6
      // equity = 10166.7 - 15.6 = 10151.1
      expect(result.daily[2]).toMatchObject({
        date: '2025-08-03',
        realized_pnl_usd: 0,
        unrealized_pnl_usd: -15.3,
        fees_usd: 0,
        funding_usd: -0.3,
        net_pnl_usd: -15.6,
        equity_usd: 10151.1
      });

      // Check Summary totals
      expect(result.summary).toEqual({
        total_realized_usd: 170.5,
        total_unrealized_usd: -15.3,
        total_fees_usd: 3.3,
        total_funding_usd: -0.8,
        net_pnl_usd: 151.1
      });
    });

    it('should fill zero values for days with no activity without crashing', () => {
      const result = calculateDailyPnL({
        wallet: '0x0000000000000000000000000000000000000000',
        startDateStr: '2025-08-01',
        endDateStr: '2025-08-02',
        fills: [],
        fundingHistory: [],
        positions: [],
        initialEquity: 5000
      });

      expect(result.daily).toHaveLength(2);
      expect(result.daily[0]).toEqual({
        date: '2025-08-01',
        realized_pnl_usd: 0,
        unrealized_pnl_usd: 0,
        fees_usd: 0,
        funding_usd: 0,
        net_pnl_usd: 0,
        equity_usd: 5000
      });
      expect(result.summary).toEqual({
        total_realized_usd: 0,
        total_unrealized_usd: 0,
        total_fees_usd: 0,
        total_funding_usd: 0,
        net_pnl_usd: 0
      });
    });
  });
});

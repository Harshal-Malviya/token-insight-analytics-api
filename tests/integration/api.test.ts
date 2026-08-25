import request from 'supertest';
import app from '../../src/app';

describe('API Routes Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 OK with health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /api/hyperliquid/:wallet/pnl validation', () => {
    it('should return 400 Bad Request for invalid wallet format', async () => {
      const res = await request(app).get('/api/hyperliquid/invalid_wallet/pnl?start=2025-08-01&end=2025-08-03');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid input');
    });

    it('should return 400 Bad Request if start date is missing or invalid format', async () => {
      const res = await request(app).get('/api/hyperliquid/0x0000000000000000000000000000000000000000/pnl?start=2025-13-01&end=2025-08-03');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('YYYY-MM-DD');
    });

    it('should return 400 Bad Request if start date is after end date', async () => {
      const res = await request(app).get('/api/hyperliquid/0x0000000000000000000000000000000000000000/pnl?start=2025-08-05&end=2025-08-01');
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cannot be after');
    });

    it('should return 200 OK with formatted PnL data for valid inputs', async () => {
      const res = await request(app).get('/api/hyperliquid/0x0000000000000000000000000000000000000000/pnl?start=2025-08-01&end=2025-08-03');
      expect(res.status).toBe(200);
      expect(res.body.wallet).toBe('0x0000000000000000000000000000000000000000');
      expect(res.body.daily).toHaveLength(3);
      expect(res.body.summary).toBeDefined();
    });
  });

  describe('POST /api/token/:id/insight validation', () => {
    it('should return 400 Bad Request for invalid history_days parameter', async () => {
      const res = await request(app)
        .post('/api/token/ethereum/insight')
        .send({ history_days: -10 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('integer between 1 and 365');
    });
  });
});

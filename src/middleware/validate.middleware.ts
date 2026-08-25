import { Request, Response, NextFunction } from 'express';
import { isValidDateString } from '../utils/dateUtils';

export function validateTokenInsightRequest(req: Request, res: Response, next: NextFunction): void {
  const { vs_currency, history_days } = req.body || {};

  if (vs_currency !== undefined && (typeof vs_currency !== 'string' || vs_currency.trim().length === 0)) {
    res.status(400).json({
      error: 'Invalid input',
      message: "'vs_currency' must be a valid non-empty string, e.g. 'usd' or 'eur'"
    });
    return;
  }

  if (history_days !== undefined) {
    const days = Number(history_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      res.status(400).json({
        error: 'Invalid input',
        message: "'history_days' must be an integer between 1 and 365"
      });
      return;
    }
  }

  next();
}

export function validateHyperLiquidPnLRequest(req: Request, res: Response, next: NextFunction): void {
  const { wallet } = req.params;
  const { start, end } = req.query;

  // Validate wallet address (EVM 0x format)
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    res.status(400).json({
      error: 'Invalid input',
      message: 'Invalid wallet address format. Must be a valid 42-character 0x EVM address.'
    });
    return;
  }

  // Validate start date
  if (!start || typeof start !== 'string' || !isValidDateString(start)) {
    res.status(400).json({
      error: 'Invalid input',
      message: "Query parameter 'start' is required and must be in YYYY-MM-DD format (e.g. 2025-08-01)."
    });
    return;
  }

  // Validate end date
  if (!end || typeof end !== 'string' || !isValidDateString(end)) {
    res.status(400).json({
      error: 'Invalid input',
      message: "Query parameter 'end' is required and must be in YYYY-MM-DD format (e.g. 2025-08-03)."
    });
    return;
  }

  // Check start date <= end date
  if (start > end) {
    res.status(400).json({
      error: 'Invalid input',
      message: `'start' date (${start}) cannot be after 'end' date (${end}).`
    });
    return;
  }

  next();
}

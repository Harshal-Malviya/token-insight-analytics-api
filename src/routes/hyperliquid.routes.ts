import { Router } from 'express';
import { getHyperLiquidPnLHandler } from '../controllers/hyperliquid.controller';
import { validateHyperLiquidPnLRequest } from '../middleware/validate.middleware';

const router = Router();

// GET /api/hyperliquid/:wallet/pnl?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/:wallet/pnl', validateHyperLiquidPnLRequest, getHyperLiquidPnLHandler);

export default router;

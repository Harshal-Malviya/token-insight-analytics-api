import { Router } from 'express';
import tokenRoutes from './token.routes';
import hyperliquidRoutes from './hyperliquid.routes';

const router = Router();

router.use('/token', tokenRoutes);
router.use('/hyperliquid', hyperliquidRoutes);

export default router;

import { Router } from 'express';
import { getTokenInsightHandler } from '../controllers/token.controller';
import { validateTokenInsightRequest } from '../middleware/validate.middleware';

const router = Router();

// POST /api/token/:id/insight
router.post('/:id/insight', validateTokenInsightRequest, getTokenInsightHandler);

export default router;

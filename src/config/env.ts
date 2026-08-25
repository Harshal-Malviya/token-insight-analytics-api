import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // AI Config
  aiProvider: (process.env.AI_PROVIDER || 'openai').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || '',
  huggingfaceModel: process.env.HUGGINGFACE_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  
  llamacppUrl: process.env.LLAMACPP_URL || 'http://localhost:8080/v1/chat/completions',
  
  // External APIs
  coingeckoApiUrl: process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  hyperliquidApiUrl: process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info'
};

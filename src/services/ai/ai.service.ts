import { IAIProvider, AIInsightResponse } from './ai.interface';
import { OpenAIProvider } from './openai.provider';
import { HuggingFaceProvider } from './huggingface.provider';
import { LlamaCppProvider } from './llamacpp.provider';
import { config } from '../../config/env';
import { CoinGeckoTokenData } from '../coingecko.service';

export function getAIProvider(providerName = config.aiProvider): IAIProvider {
  switch (providerName.toLowerCase()) {
    case 'huggingface':
      return new HuggingFaceProvider();
    case 'llamacpp':
      return new LlamaCppProvider();
    case 'openai':
    default:
      return new OpenAIProvider();
  }
}

export function buildPrompt(tokenData: CoinGeckoTokenData): string {
  const { name, symbol, market_data } = tokenData;
  const price = market_data.current_price_usd;
  const marketCap = market_data.market_cap_usd;
  const volume = market_data.total_volume_usd;
  const change24h = market_data.price_change_percentage_24h;

  return `
Analyze the following crypto token metrics and provide a short market insight:
- Token: ${name} (${symbol.toUpperCase()})
- Price (USD): $${price.toLocaleString()}
- Market Cap (USD): $${marketCap.toLocaleString()}
- 24h Volume (USD): $${volume.toLocaleString()}
- 24h Price Change: ${change24h}%

Return a JSON object with:
- "reasoning": A 1-2 sentence concise technical/fundamental analysis.
- "sentiment": Exactly one of ["Positive", "Neutral", "Negative"].
`.trim();
}

/**
 * Cleans string and extracts JSON object substring if wrapped in markdown codeblocks.
 */
export function extractJSON(text: string): any {
  let cleaned = text.trim();
  // Strip markdown ```json ... ``` blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * Validates whether parsed object satisfies { reasoning: string, sentiment: "Positive"|"Neutral"|"Negative" }
 */
export function validateAIResponse(data: any): AIInsightResponse | null {
  if (!data || typeof data !== 'object') return null;

  const reasoning = typeof data.reasoning === 'string' ? data.reasoning.trim() : '';
  let sentiment = data.sentiment;

  if (typeof sentiment === 'string') {
    sentiment = sentiment.trim();
    // Capitalize first letter to normalize
    const normalized = sentiment.charAt(0).toUpperCase() + sentiment.slice(1).toLowerCase();
    if (['Positive', 'Neutral', 'Negative'].includes(normalized)) {
      sentiment = normalized;
    } else {
      return null;
    }
  } else {
    return null;
  }

  if (!reasoning) return null;

  return {
    reasoning,
    sentiment: sentiment as 'Positive' | 'Neutral' | 'Negative'
  };
}

/**
 * Generate fallback insight if AI provider call or parsing fails
 */
export function generateFallbackInsight(tokenData: CoinGeckoTokenData): AIInsightResponse {
  const change = tokenData.market_data.price_change_percentage_24h;
  let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';

  if (change > 2.0) {
    sentiment = 'Positive';
  } else if (change < -2.0) {
    sentiment = 'Negative';
  }

  const priceStr = tokenData.market_data.current_price_usd.toLocaleString();
  const reasoning = `${tokenData.name} (${tokenData.symbol.toUpperCase()}) is currently trading at $${priceStr} with a 24-hour price movement of ${change}%. Market volume stands at $${tokenData.market_data.total_volume_usd.toLocaleString()}.`;

  return { reasoning, sentiment };
}

export async function generateTokenInsight(tokenData: CoinGeckoTokenData): Promise<{
  insight: AIInsightResponse;
  model: { provider: string; model: string };
}> {
  const provider = getAIProvider();
  const prompt = buildPrompt(tokenData);

  // Attempt up to 2 calls (1 initial + 1 retry)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const rawOutput = await provider.generateInsight(prompt);
      const parsed = extractJSON(rawOutput);
      const validated = validateAIResponse(parsed);

      if (validated) {
        return {
          insight: validated,
          model: {
            provider: provider.name,
            model: provider.model
          }
        };
      }
    } catch (err) {
      // Continue to next attempt or fallback
    }
  }

  // Safe fallback if provider failed or returned invalid JSON
  const fallbackInsight = generateFallbackInsight(tokenData);
  return {
    insight: fallbackInsight,
    model: {
      provider: provider.name,
      model: `${provider.model} (fallback)`
    }
  };
}

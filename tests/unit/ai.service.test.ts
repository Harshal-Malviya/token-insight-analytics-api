import {
  buildPrompt,
  extractJSON,
  validateAIResponse,
  generateFallbackInsight,
  generateTokenInsight
} from '../../src/services/ai/ai.service';
import { CoinGeckoTokenData } from '../../src/services/coingecko.service';

describe('AI Service & JSON Parsing', () => {
  const mockTokenData: CoinGeckoTokenData = {
    id: 'chainlink',
    symbol: 'link',
    name: 'Chainlink',
    market_data: {
      current_price_usd: 7.23,
      market_cap_usd: 3500000000,
      total_volume_usd: 120000000,
      price_change_percentage_24h: -1.2
    }
  };

  it('should build a structured prompt containing token metrics', () => {
    const prompt = buildPrompt(mockTokenData);
    expect(prompt).toContain('Chainlink');
    expect(prompt).toContain('LINK');
    expect(prompt).toContain('7.23');
    expect(prompt).toContain('-1.2%');
  });

  it('should extract JSON from markdown code blocks', () => {
    const rawMarkdown = '```json\n{"reasoning": "Strong support", "sentiment": "Positive"}\n```';
    const parsed = extractJSON(rawMarkdown);
    expect(parsed).toEqual({
      reasoning: 'Strong support',
      sentiment: 'Positive'
    });
  });

  it('should validate correct AI response JSON schema', () => {
    const valid = { reasoning: 'Market looks neutral', sentiment: 'neutral' };
    const validated = validateAIResponse(valid);
    expect(validated).toEqual({
      reasoning: 'Market looks neutral',
      sentiment: 'Neutral'
    });
  });

  it('should reject invalid AI response JSON schema', () => {
    expect(validateAIResponse(null)).toBeNull();
    expect(validateAIResponse({ reasoning: '' })).toBeNull();
    expect(validateAIResponse({ reasoning: 'ok', sentiment: 'SuperBullish' })).toBeNull();
  });

  it('should generate a safe rule-based fallback insight', () => {
    const fallback = generateFallbackInsight(mockTokenData);
    expect(fallback.reasoning).toContain('Chainlink');
    expect(fallback.sentiment).toBe('Neutral');

    const bullishToken = {
      ...mockTokenData,
      market_data: { ...mockTokenData.market_data, price_change_percentage_24h: 5.5 }
    };
    expect(generateFallbackInsight(bullishToken).sentiment).toBe('Positive');
  });

  it('should fall back gracefully when provider fails', async () => {
    const res = await generateTokenInsight(mockTokenData);
    expect(res.insight).toBeDefined();
    expect(['Positive', 'Neutral', 'Negative']).toContain(res.insight.sentiment);
    expect(res.model.provider).toBeDefined();
  });
});

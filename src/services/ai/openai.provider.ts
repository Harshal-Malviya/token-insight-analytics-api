import axios from 'axios';
import { IAIProvider } from './ai.interface';
import { config } from '../../config/env';

export class OpenAIProvider implements IAIProvider {
  public name = 'openai';
  public model: string;

  constructor() {
    this.model = config.openaiModel || 'gpt-4o-mini';
  }

  async generateInsight(prompt: string): Promise<string> {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured in .env');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a crypto market analyst. Return ONLY valid JSON matching this exact shape: { "reasoning": string, "sentiment": "Positive" | "Neutral" | "Negative" }.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openaiApiKey}`
        },
        timeout: 12000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response content');
    }

    return content;
  }
}

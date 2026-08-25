import axios from 'axios';
import { IAIProvider } from './ai.interface';
import { config } from '../../config/env';

export class LlamaCppProvider implements IAIProvider {
  public name = 'llamacpp';
  public model = 'local-llama';

  async generateInsight(prompt: string): Promise<string> {
    const url = config.llamacppUrl;

    const response = await axios.post(
      url,
      {
        messages: [
          {
            role: 'system',
            content:
              'You are a crypto market analyst. Return ONLY valid JSON matching this exact shape: { "reasoning": string, "sentiment": "Positive" | "Neutral" | "Negative" }.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Llama.cpp returned empty response content');
    }

    return content;
  }
}

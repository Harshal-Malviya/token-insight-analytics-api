import axios from 'axios';
import { IAIProvider } from './ai.interface';
import { config } from '../../config/env';

export class HuggingFaceProvider implements IAIProvider {
  public name = 'huggingface';
  public model: string;

  constructor() {
    this.model = config.huggingfaceModel || 'mistralai/Mixtral-8x7B-Instruct-v0.1';
  }

  async generateInsight(prompt: string): Promise<string> {
    if (!config.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY is not configured in .env');
    }

    const url = `https://api-inference.huggingface.co/models/${this.model}`;
    const fullPrompt = `<s>[INST] You are a crypto market analyst. Analyze the following token metrics and return ONLY a raw JSON object with keys "reasoning" (string) and "sentiment" ("Positive" | "Neutral" | "Negative"). Do not output any markdown formatting or explanations outside JSON.\n\n${prompt} [/INST]`;

    const response = await axios.post(
      url,
      {
        inputs: fullPrompt,
        parameters: { max_new_tokens: 250, return_full_text: false }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.huggingfaceApiKey}`
        },
        timeout: 12000
      }
    );

    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    const generatedText = result?.generated_text || result?.text || JSON.stringify(result);

    return generatedText;
  }
}

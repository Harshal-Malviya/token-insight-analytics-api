export interface AIInsightResponse {
  reasoning: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface IAIProvider {
  name: string;
  model: string;
  generateInsight(prompt: string): Promise<string>;
}

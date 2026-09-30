import type { AIService } from './AIService';
import { MockAIService } from './MockAIService';

export * from './AIService';

/** Single swap point: return a real implementation here in a later phase. */
export const aiService: AIService = new MockAIService();

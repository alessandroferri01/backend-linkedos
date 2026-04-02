import OpenAI from 'openai';
import { ENV } from '../config';
import { InternalError, logger } from '../utils';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

interface GeneratePostInput {
  topic: string;
  profession?: string;
  tone?: string;
  targetAudience?: string;
  writingStyle?: string;
  length?: 'short' | 'medium' | 'long';
  isPro?: boolean;
}

const LENGTH_CONFIG = {
  short:  { words: '100-200', tokens: 600 },
  medium: { words: '200-350', tokens: 1000 },
  long:   { words: '350-500', tokens: 1500 },
} as const;

function buildPrompt(input: GeneratePostInput): string {
  const parts = [
    `Topic: ${input.topic}`,
    input.profession && `Profession: ${input.profession}`,
    input.targetAudience && `Target audience: ${input.targetAudience}`,
    input.tone && `Tone: ${input.tone}`,
    input.writingStyle && `Writing style: ${input.writingStyle}`,
  ].filter(Boolean);

  return parts.join('\n');
}

function buildSystemPrompt(length: 'short' | 'medium' | 'long' = 'medium'): string {
  const { words } = LENGTH_CONFIG[length];
  return `You are a LinkedIn content strategist specialized in Italian professionals.
Create engaging LinkedIn posts following these rules:
- Start with a strong hook (first line is crucial)
- Use short paragraphs (1-2 sentences max)
- Include a clear call-to-action at the end
- Do not use emojis unless explicitly requested
- Write in Italian unless specified otherwise
- Keep the post between ${words} words
- Make the content authentic and relatable`;
}

export const aiService = {
  async generatePost(input: GeneratePostInput): Promise<string> {
    try {
      const length = input.length ?? 'medium';
      const { tokens } = LENGTH_CONFIG[length];

      const model = input.isPro ? 'gpt-5.4-mini' : 'gpt-5.4-nano';

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt(length) },
          { role: 'user', content: buildPrompt(input) },
        ],
        temperature: 0.8,
        max_completion_tokens: tokens,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new InternalError('AI provider returned empty response');
      }

      return content;
    } catch (error) {
      if (error instanceof InternalError) throw error;

      logger.error('AI generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new InternalError('Failed to generate post content');
    }
  },
};

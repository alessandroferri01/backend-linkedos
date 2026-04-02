import { postRepository } from '../repositories';
import { profileRepository } from '../repositories';
import { userRepository } from '../repositories';
import { aiService } from './ai.service';
import { creditService } from './credit.service';
import { NotFoundError, ForbiddenError } from '../utils';

interface GenerateInput {
  userId: string;
  topic: string;
  length?: 'short' | 'medium' | 'long';
}

export const postService = {
  async generate(input: GenerateInput) {
    const credits = await creditService.checkCredits(input.userId);
    if (credits <= 0) {
      throw new ForbiddenError('No credits remaining', 'NO_CREDITS');
    }

    const profile = await profileRepository.findByUserId(input.userId);
    const user = await userRepository.findById(input.userId);
    const isPro = user?.subscriptionStatus === 'ACTIVE';

    // Only Pro users can use length other than medium
    let length = input.length ?? 'medium';
    if (length !== 'medium' && !isPro) {
      length = 'medium';
    }

    const content = await aiService.generatePost({
      topic: input.topic,
      profession: profile?.profession ?? undefined,
      tone: profile?.tone ?? undefined,
      targetAudience: profile?.targetAudience ?? undefined,
      writingStyle: profile?.writingStyle ?? undefined,
      length,
      isPro,
    });

    const post = await postRepository.create({
      userId: input.userId,
      topic: input.topic,
      generatedContent: content,
    });

    await creditService.decrementCredits(input.userId);

    return post;
  },

  async getByUserId(options: {
    userId: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'topic';
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }) {
    return postRepository.findByUserId(options);
  },

  async getById(postId: string, userId: string) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found', 'POST_NOT_FOUND');
    }
    if (post.userId !== userId) {
      throw new ForbiddenError('Not authorized to view this post', 'FORBIDDEN');
    }
    return post;
  },

  async deletePost(postId: string, userId: string) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found', 'POST_NOT_FOUND');
    }
    if (post.userId !== userId) {
      throw new ForbiddenError('Not authorized to delete this post', 'FORBIDDEN');
    }
    await postRepository.delete(postId);
  },
};

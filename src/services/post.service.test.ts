import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postService } from './post.service';

const mockCheckCredits = vi.fn();
const mockDecrementCredits = vi.fn();

vi.mock('./credit.service', () => ({
  creditService: {
    checkCredits: (...args: unknown[]) => mockCheckCredits(...args),
    decrementCredits: (...args: unknown[]) => mockDecrementCredits(...args),
  },
}));

const mockGeneratePost = vi.fn();

vi.mock('./ai.service', () => ({
  aiService: {
    generatePost: (...args: unknown[]) => mockGeneratePost(...args),
  },
}));

const mockFindByUserId = vi.fn();
const mockProfileFindByUserId = vi.fn();
const mockPostCreate = vi.fn();
const mockPostFindById = vi.fn();
const mockPostDelete = vi.fn();

vi.mock('../repositories', () => ({
  postRepository: {
    findByUserId: (...args: unknown[]) => mockFindByUserId(...args),
    findById: (...args: unknown[]) => mockPostFindById(...args),
    create: (...args: unknown[]) => mockPostCreate(...args),
    delete: (...args: unknown[]) => mockPostDelete(...args),
  },
  profileRepository: {
    findByUserId: (...args: unknown[]) => mockProfileFindByUserId(...args),
  },
}));

const MOCK_POST = {
  id: 'post-1',
  userId: 'user-1',
  topic: 'Leadership',
  generatedContent: 'Generated content here...',
  createdAt: new Date(),
};

describe('postService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a post successfully', async () => {
      mockCheckCredits.mockResolvedValue(5);
      mockProfileFindByUserId.mockResolvedValue({
        profession: 'Developer',
        tone: 'professional',
        targetAudience: 'Tech leads',
        writingStyle: 'concise',
      });
      mockGeneratePost.mockResolvedValue('Generated content here...');
      mockPostCreate.mockResolvedValue(MOCK_POST);
      mockDecrementCredits.mockResolvedValue(4);

      const result = await postService.generate({ userId: 'user-1', topic: 'Leadership' });

      expect(result).toEqual(MOCK_POST);
      expect(mockCheckCredits).toHaveBeenCalledWith('user-1');
      expect(mockGeneratePost).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Leadership', profession: 'Developer' }),
      );
      expect(mockPostCreate).toHaveBeenCalled();
      expect(mockDecrementCredits).toHaveBeenCalledWith('user-1');
    });

    it('should throw ForbiddenError if no credits', async () => {
      mockCheckCredits.mockResolvedValue(0);

      await expect(
        postService.generate({ userId: 'user-1', topic: 'Leadership' }),
      ).rejects.toThrow('No credits remaining');

      expect(mockGeneratePost).not.toHaveBeenCalled();
    });

    it('should work with no profile data', async () => {
      mockCheckCredits.mockResolvedValue(3);
      mockProfileFindByUserId.mockResolvedValue(null);
      mockGeneratePost.mockResolvedValue('Content');
      mockPostCreate.mockResolvedValue(MOCK_POST);
      mockDecrementCredits.mockResolvedValue(2);

      const result = await postService.generate({ userId: 'user-1', topic: 'Test' });

      expect(result).toEqual(MOCK_POST);
      expect(mockGeneratePost).toHaveBeenCalledWith(
        expect.objectContaining({ topic: 'Test' }),
      );
    });
  });

  describe('getByUserId', () => {
    it('should return posts for a user', async () => {
      mockFindByUserId.mockResolvedValue([MOCK_POST]);

      const result = await postService.getByUserId('user-1');

      expect(result).toEqual([MOCK_POST]);
      expect(mockFindByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('deletePost', () => {
    it('should delete a post owned by the user', async () => {
      mockPostFindById.mockResolvedValue(MOCK_POST);

      await postService.deletePost('post-1', 'user-1');

      expect(mockPostDelete).toHaveBeenCalledWith('post-1');
    });

    it('should throw NotFoundError if post does not exist', async () => {
      mockPostFindById.mockResolvedValue(null);

      await expect(postService.deletePost('missing', 'user-1')).rejects.toThrow(
        'Post not found',
      );
    });

    it('should throw ForbiddenError if user does not own the post', async () => {
      mockPostFindById.mockResolvedValue({ ...MOCK_POST, userId: 'other-user' });

      await expect(postService.deletePost('post-1', 'user-1')).rejects.toThrow(
        'Not authorized to delete this post',
      );
      expect(mockPostDelete).not.toHaveBeenCalled();
    });
  });
});

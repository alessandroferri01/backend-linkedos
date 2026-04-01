import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const generatePostSchema = z.object({
  body: z.object({
    topic: z.string().min(3, 'Topic must be at least 3 characters').max(500, 'Topic too long'),
    length: z.enum(['short', 'medium', 'long']).optional(),
  }),
});

export const deletePostSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid post ID'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().max(50, 'First name too long').optional(),
    lastName: z.string().max(50, 'Last name too long').optional(),
    phone: z.string().max(20, 'Phone number too long').optional(),
  }),
});

export const updateAIProfileSchema = z.object({
  body: z.object({
    profession: z.string().max(100, 'Profession too long').optional(),
    tone: z.string().max(50, 'Tone too long').optional(),
    targetAudience: z.string().max(200, 'Target audience too long').optional(),
    writingStyle: z.string().max(100, 'Writing style too long').optional(),
  }),
});

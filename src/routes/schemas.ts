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
  }),
});

export const deletePostSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid post ID'),
  }),
});

import { userRepository } from '../repositories';
import { BadRequestError, NotFoundError } from '../utils';

const FREE_CREDITS = 5;
const PRO_CREDITS = 100;

export const creditService = {
  async checkCredits(userId: string): Promise<number> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    return user.creditsRemaining;
  },

  async decrementCredits(userId: string): Promise<number> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    if (user.creditsRemaining <= 0) {
      throw new BadRequestError('No credits remaining', 'NO_CREDITS');
    }

    const updated = await userRepository.decrementCredits(userId);
    return updated.creditsRemaining;
  },

  async resetMonthlyCredits(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const credits = user.subscriptionStatus === 'ACTIVE' ? PRO_CREDITS : FREE_CREDITS;
    await userRepository.updateCredits(userId, credits);
  },
};

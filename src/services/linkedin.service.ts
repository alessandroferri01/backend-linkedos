import { ENV } from '../config';
import { userRepository } from '../repositories';
import { postRepository } from '../repositories';
import { BadRequestError, UnauthorizedError, InternalError } from '../utils/errors';
import { logger } from '../utils/logger';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_BASE = 'https://api.linkedin.com';
const LINKEDIN_API_VERSION = '202504';

const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

interface LinkedInUserInfo {
  sub: string;
  name: string;
  email: string;
  picture?: string;
}

interface LinkedInPostStats {
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export const linkedinService = {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ENV.LINKEDIN_CLIENT_ID,
      redirect_uri: ENV.LINKEDIN_REDIRECT_URI,
      state,
      scope: SCOPES.join(' '),
    });
    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string): Promise<LinkedInTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: ENV.LINKEDIN_CLIENT_ID,
      client_secret: ENV.LINKEDIN_CLIENT_SECRET,
      redirect_uri: ENV.LINKEDIN_REDIRECT_URI,
    });

    const res = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const error = await res.text();
      logger.error('LinkedIn token exchange failed', { error });
      throw new InternalError('Impossibile completare il collegamento con LinkedIn');
    }

    return res.json() as Promise<LinkedInTokenResponse>;
  },

  async getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const res = await fetch(`${LINKEDIN_API_BASE}/v2/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new InternalError('Impossibile recuperare il profilo LinkedIn');
    }

    return res.json() as Promise<LinkedInUserInfo>;
  },

  async connectAccount(userId: string, code: string): Promise<void> {
    const tokens = await this.exchangeCodeForTokens(code);
    const userInfo = await this.getUserInfo(tokens.access_token);

    // Check if this LinkedIn account is already connected to another user
    const existingUser = await userRepository.findByLinkedinId(userInfo.sub);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestError('Questo account LinkedIn è già collegato a un altro utente');
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await userRepository.updateLinkedin(userId, {
      linkedinId: userInfo.sub,
      linkedinAccessToken: tokens.access_token,
      linkedinRefreshToken: tokens.refresh_token ?? null,
      linkedinTokenExpiresAt: expiresAt,
      linkedinConnected: true,
    });

    logger.info('LinkedIn account connected', { userId, linkedinId: userInfo.sub });
  },

  async disconnectAccount(userId: string): Promise<void> {
    await userRepository.updateLinkedin(userId, {
      linkedinId: null,
      linkedinAccessToken: null,
      linkedinRefreshToken: null,
      linkedinTokenExpiresAt: null,
      linkedinConnected: false,
    });

    logger.info('LinkedIn account disconnected', { userId });
  },

  async getConnectionStatus(userId: string): Promise<{ connected: boolean; linkedinId: string | null }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Utente non trovato');

    return {
      connected: user.linkedinConnected,
      linkedinId: user.linkedinId,
    };
  },

  async getValidAccessToken(userId: string): Promise<string> {
    const user = await userRepository.findById(userId);
    if (!user || !user.linkedinConnected || !user.linkedinAccessToken) {
      throw new BadRequestError('Account LinkedIn non collegato');
    }

    // Check if token is expired
    if (user.linkedinTokenExpiresAt && user.linkedinTokenExpiresAt < new Date()) {
      if (user.linkedinRefreshToken) {
        try {
          return await this.refreshAccessToken(userId, user.linkedinRefreshToken);
        } catch {
          // If refresh fails, disconnect and require re-auth
          await this.disconnectAccount(userId);
          throw new BadRequestError('Sessione LinkedIn scaduta. Ricollega il tuo account');
        }
      }
      await this.disconnectAccount(userId);
      throw new BadRequestError('Sessione LinkedIn scaduta. Ricollega il tuo account');
    }

    return user.linkedinAccessToken;
  },

  async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: ENV.LINKEDIN_CLIENT_ID,
      client_secret: ENV.LINKEDIN_CLIENT_SECRET,
    });

    const res = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new InternalError('Impossibile rinnovare il token LinkedIn');
    }

    const tokens = await res.json() as LinkedInTokenResponse;
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await userRepository.updateLinkedin(userId, {
      linkedinAccessToken: tokens.access_token,
      linkedinRefreshToken: tokens.refresh_token ?? refreshToken,
      linkedinTokenExpiresAt: expiresAt,
      linkedinConnected: true,
      linkedinId: undefined, // keep existing
    });

    return tokens.access_token;
  },

  async publishPost(userId: string, postId: string): Promise<{ linkedinPostUrn: string }> {
    const user = await userRepository.findById(userId);
    if (!user) throw new UnauthorizedError('Utente non trovato');

    const post = await postRepository.findById(postId);
    if (!post || post.userId !== userId) {
      throw new BadRequestError('Post non trovato');
    }

    if (post.publishedToLinkedin) {
      throw new BadRequestError('Questo post è già stato pubblicato su LinkedIn');
    }

    const accessToken = await this.getValidAccessToken(userId);

    const postBody = {
      author: `urn:li:person:${user.linkedinId}`,
      lifecycleState: 'PUBLISHED',
      visibility: 'PUBLIC',
      commentary: post.generatedContent,
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/rest/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': LINKEDIN_API_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(postBody),
    });

    if (!res.ok) {
      const error = await res.text();
      logger.error('LinkedIn post publish failed', { error, postId, userId });
      throw new InternalError('Impossibile pubblicare il post su LinkedIn');
    }

    // LinkedIn returns the post URN in the x-restli-id header
    const postUrn = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || '';

    await postRepository.updateLinkedinPublish(postId, postUrn);

    logger.info('Post published to LinkedIn', { userId, postId, postUrn });

    return { linkedinPostUrn: postUrn };
  },

  async getPostStats(userId: string, postId: string): Promise<LinkedInPostStats> {
    const post = await postRepository.findById(postId);
    if (!post || post.userId !== userId) {
      throw new BadRequestError('Post non trovato');
    }

    if (!post.publishedToLinkedin || !post.linkedinPostUrn) {
      throw new BadRequestError('Questo post non è stato pubblicato su LinkedIn');
    }

    const accessToken = await this.getValidAccessToken(userId);

    const encodedUrn = encodeURIComponent(post.linkedinPostUrn);

    // Fetch social actions (likes, comments, etc.)
    const res = await fetch(
      `${LINKEDIN_API_BASE}/rest/socialActions/${encodedUrn}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': LINKEDIN_API_VERSION,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      },
    );

    if (!res.ok) {
      // If social actions endpoint fails, try socialMetadata
      const metaRes = await fetch(
        `${LINKEDIN_API_BASE}/rest/socialMetadata/${encodedUrn}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'LinkedIn-Version': LINKEDIN_API_VERSION,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      if (!metaRes.ok) {
        logger.warn('LinkedIn post not found, marking as unpublished', { postId });
        // Post was likely deleted on LinkedIn — reset the flag
        await postRepository.update(postId, {
          publishedToLinkedin: false,
          linkedinPostUrn: null,
          publishedAt: null,
        });
        throw new BadRequestError('Il post è stato eliminato da LinkedIn');
      }

      const meta = await metaRes.json() as Record<string, any>;
      return {
        likeCount: meta.totalShareStatistics?.likeCount ?? meta.likeCount ?? 0,
        commentCount: meta.totalShareStatistics?.commentCount ?? meta.commentCount ?? 0,
        shareCount: meta.totalShareStatistics?.shareCount ?? meta.shareCount ?? 0,
      };
    }

    const data = await res.json() as Record<string, any>;
    return {
      likeCount: data.likesSummary?.totalLikes ?? 0,
      commentCount: data.commentsSummary?.totalFirstLevelComments ?? 0,
      shareCount: data.sharesSummary?.totalShares ?? 0,
    };
  },
};

import type { ClerkAuthPlugin, ClerkAuthState } from './ClerkAuthPlugin';

const emptyAuthState: ClerkAuthState = {
  isSignedIn: false,
  userId: null,
  email: null,
  name: null,
};

export class ClerkAuthWeb implements ClerkAuthPlugin {
  async getAuthState(): Promise<ClerkAuthState> {
    if (typeof localStorage === 'undefined') {
      return emptyAuthState;
    }

    const token = localStorage.getItem('__clerk_token') || localStorage.getItem('clerk-db-jwt');
    const userData = localStorage.getItem('__clerk_user');

    if (!token || !userData) {
      return emptyAuthState;
    }

    try {
      const user = JSON.parse(userData);
      const email =
        user.emailAddresses?.[0]?.emailAddress ||
        user.email_addresses?.[0]?.email_address ||
        user.primaryEmailAddress?.emailAddress ||
        null;

      return {
        isSignedIn: true,
        userId: user.id || null,
        email,
        name: user.fullName || user.full_name || user.firstName || user.first_name || email,
      };
    } catch {
      return emptyAuthState;
    }
  }

  async getToken(): Promise<{ token: string }> {
    const token = localStorage.getItem('__clerk_token') || localStorage.getItem('clerk-db-jwt');
    if (!token) {
      throw new Error('No token available');
    }
    return { token };
  }

  async signOut(): Promise<void> {
    localStorage.removeItem('__clerk_token');
    localStorage.removeItem('__clerk_user');
    localStorage.removeItem('clerk-db-jwt');
  }
}

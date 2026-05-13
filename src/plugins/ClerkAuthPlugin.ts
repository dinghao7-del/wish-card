import { registerPlugin } from '@capacitor/core';

export interface ClerkAuthState {
  isSignedIn: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
}

export interface ClerkAuthPlugin {
  getAuthState(): Promise<ClerkAuthState>;
  getToken(): Promise<{ token: string }>;
  signOut(): Promise<void>;
}

const ClerkAuth = registerPlugin<ClerkAuthPlugin>('ClerkAuth', {
  web: () => import('./ClerkAuthWeb').then((m) => new m.ClerkAuthWeb()),
});

export default ClerkAuth;

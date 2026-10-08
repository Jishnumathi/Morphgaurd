/**
 * MorphGuard AI — Google Sign-In & Forensic Identity Service
 * Implements Google Identity Services (GSI) API, OAuth token handling,
 * and session lifecycle management for forensic examiners.
 */

import { UserSession, UserRole } from '../../types.js';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          disableAutoSelect: () => void;
          revoke: (hint: string, callback?: (done: any) => void) => void;
        };
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
          revoke: (accessToken: string, done?: () => void) => void;
        };
      };
    };
  }
}

const STORAGE_KEY = 'morphguard_active_session_v1';

export interface GoogleAuthConfig {
  clientId: string;
  appUrl: string;
  configured: boolean;
}

/**
 * Parses a standard Google ID Token (JWT) on the client safely
 */
export function decodeGoogleJwt(token: string): {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
  hd?: string;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Failed to parse Google JWT credential:', err);
    return null;
  }
}

class GoogleAuthService {
  private config: GoogleAuthConfig = {
    clientId: '',
    appUrl: '',
    configured: false,
  };
  private isConfigLoaded = false;
  private tokenClient: any = null;

  /**
   * Fetch runtime server configuration for OAuth Client ID
   */
  async loadConfig(): Promise<GoogleAuthConfig> {
    if (this.isConfigLoaded) return this.config;

    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const data = await res.json();
        this.config = {
          clientId: data.googleClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '',
          appUrl: data.appUrl || window.location.origin,
          configured: !!(data.googleClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID),
        };
      }
    } catch (err) {
      console.warn('Could not fetch /api/auth/config, falling back to window environment:', err);
      const viteId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
      this.config = {
        clientId: viteId,
        appUrl: window.location.origin,
        configured: !!viteId,
      };
    }
    this.isConfigLoaded = true;
    return this.config;
  }

  /**
   * Retrieves any existing active session from localStorage
   */
  getPersistedSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Persists active user session
   */
  setPersistedSession(user: UserSession | null) {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to update local storage session:', err);
    }
  }

  /**
   * Initialize Google Identity Services (GSI) Button inside a target element
   */
  async renderGoogleButton(
    container: HTMLElement,
    onSuccess: (user: UserSession) => void,
    onError: (err: Error) => void,
    role: UserRole = 'ANALYST'
  ): Promise<boolean> {
    const config = await this.loadConfig();

    if (!config.clientId) {
      return false;
    }

    // Wait up to 3 seconds for window.google to be present
    let attempts = 0;
    while (!window.google?.accounts?.id && attempts < 15) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!window.google?.accounts?.id) {
      onError(new Error('Google Identity Services library failed to load.'));
      return false;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: config.clientId,
        callback: async (response: { credential: string }) => {
          try {
            const user = await this.verifyCredentialWithServer(response.credential, role);
            this.setPersistedSession(user);
            onSuccess(user);
          } catch (err: any) {
            onError(err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Clear container and render button
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'filled_black',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        width: 280,
      });

      return true;
    } catch (err: any) {
      console.error('Failed to render GSI button:', err);
      onError(err);
      return false;
    }
  }

  /**
   * Direct Google OAuth Token Client Popup Flow (Interactive)
   */
  async signInWithGooglePopup(
    role: UserRole = 'ANALYST'
  ): Promise<UserSession> {
    const config = await this.loadConfig();

    if (!config.clientId) {
      throw new Error('Google Client ID is not configured in settings. Set GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID.');
    }

    // Ensure GSI script is loaded
    let attempts = 0;
    while (!window.google?.accounts?.oauth2 && attempts < 15) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google OAuth2 SDK is not ready yet.');
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              return reject(new Error(tokenResponse.error_description || tokenResponse.error));
            }
            try {
              // Fetch user info from Google using the access token
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });

              if (!userInfoRes.ok) {
                throw new Error('Failed to retrieve user profile from Google.');
              }

              const profile = await userInfoRes.json();
              const verifiedUser = await this.syncUserProfileWithServer({
                email: profile.email,
                name: profile.name,
                avatarUrl: profile.picture,
                googleId: profile.sub,
                emailVerified: profile.email_verified,
                role,
              });

              this.setPersistedSession(verifiedUser);
              resolve(verifiedUser);
            } catch (err) {
              reject(err);
            }
          },
        });

        client.requestAccessToken();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Verify an ID Token (JWT) with our backend server to establish verified audit logging
   */
  async verifyCredentialWithServer(credential: string, role: UserRole): Promise<UserSession> {
    const res = await fetch('/api/auth/google/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, role }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Server rejected Google authentication credential.');
    }

    const data = await res.json();
    return data.user;
  }

  /**
   * Register or sync authenticated Google profile with backend forensic registry
   */
  async syncUserProfileWithServer(profile: {
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
    emailVerified?: boolean;
    role: UserRole;
  }): Promise<UserSession> {
    const res = await fetch('/api/auth/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to sync Google user profile with server.');
    }

    const data = await res.json();
    return data.user;
  }

  /**
   * Instant sign in with active examiner credentials (e.g., development or quick testing)
   */
  async quickSignIn(email: string, name: string, role: UserRole): Promise<UserSession> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role }),
    });

    if (!res.ok) {
      throw new Error('Quick login failed on server.');
    }

    const data = await res.json();
    const user: UserSession = {
      ...data.user,
      authProvider: 'demo',
      lastLoginAt: new Date().toISOString(),
    };
    this.setPersistedSession(user);
    return user;
  }

  /**
   * Terminate active forensic user session
   */
  async signOut(user?: UserSession): Promise<void> {
    try {
      if (user) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, role: user.role }),
        });
      }
    } catch (err) {
      console.error('Logout logging error:', err);
    } finally {
      this.setPersistedSession(null);
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
    }
  }
}

export const googleAuthService = new GoogleAuthService();

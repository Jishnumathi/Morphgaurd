/**
 * MorphGuard AI — Forensic Authentication & Google Sign-In Modal
 * Connects Google Identity Services (GSI) API, OAuth 2.0 Identity,
 * and Role-Based Access Control for evidence examiners.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  User,
  KeyRound,
  Fingerprint,
  Info,
  Check,
  Building,
} from 'lucide-react';
import { UserSession, UserRole } from '../types.js';
import { googleAuthService, GoogleAuthConfig } from '../services/auth/googleAuth.js';
import { signInWithGoogleFirebase, signOutFirebase } from '../services/firebase/firebase.js';

interface LoginModalProps {
  isOpen: boolean;
  currentUser: UserSession;
  onClose: () => void;
  onLoginSuccess: (user: UserSession) => void;
  onLogout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onLoginSuccess,
  onLogout,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role || 'ANALYST');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<GoogleAuthConfig | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Load auth config on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      googleAuthService.loadConfig().then((cfg) => {
        setAuthConfig(cfg);
      });
    }
  }, [isOpen]);

  // Attempt to render GSI button if container and client ID are present
  useEffect(() => {
    if (isOpen && googleBtnRef.current) {
      googleAuthService
        .renderGoogleButton(
          googleBtnRef.current,
          (user) => {
            setIsLoading(false);
            setSuccessMessage(`Authenticated as ${user.name}`);
            onLoginSuccess(user);
          },
          (err) => {
            setIsLoading(false);
            setErrorMessage(err.message);
          },
          selectedRole
        )
        .catch(() => {
          // Fallback if GSI client is not ready
        });
    }
  }, [isOpen, selectedRole, authConfig?.configured]);

  if (!isOpen) return null;

  // Handle Google Interactive Sign-In Click with Firebase Auth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Primary: Firebase Auth Google Sign-In with Popup
      const fbUser = await signInWithGoogleFirebase(selectedRole);
      const sessionUser: UserSession = {
        id: fbUser.uid,
        googleId: fbUser.uid,
        name: fbUser.displayName,
        email: fbUser.email,
        avatarUrl: fbUser.photoURL,
        emailVerified: true,
        role: fbUser.role,
        agency: fbUser.agency,
        authProvider: 'google',
        lastLoginAt: new Date().toISOString(),
      };
      setSuccessMessage(`Google Authentication Verified: ${sessionUser.email}`);
      onLoginSuccess(sessionUser);
    } catch (err: any) {
      console.warn('Firebase Google Sign-In popup notice:', err);

      // Fallback: If popup restricted or cancelled, check for GSI or quick-connect
      if (authConfig?.configured) {
        try {
          const user = await googleAuthService.signInWithGooglePopup(selectedRole);
          setSuccessMessage(`Successfully connected Google Account: ${user.email}`);
          onLoginSuccess(user);
          return;
        } catch (gsiErr: any) {
          console.error('GSI fallback error:', gsiErr);
        }
      }

      // Check if popup was blocked by browser
      if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Browser blocked popup window. Please allow popups for Google Sign-in, or use Quick Connect below.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in window closed before completing authentication.');
      } else {
        setErrorMessage(
          err.message || 'Google sign-in attempt failed. You can use 1-Click Examiner Connect below.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Sign-In with runtime user email
  const handleQuickConnectEmail = async (email: string, name: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await googleAuthService.quickSignIn(email, name, selectedRole);
      setSuccessMessage(`Session connected for ${user.email}`);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const isGoogleConnected = currentUser.authProvider === 'google';

  return (
    <div
      id="login-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="login-modal-container"
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                Forensic Identity & Access Gateway
              </h2>
              <p className="text-[11px] text-slate-400">
                Google Sign-In API & Forensic Chain of Custody
              </p>
            </div>
          </div>
          <button
            id="login-modal-close-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Status Banner */}
          {isGoogleConnected ? (
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Google Identity Verified</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                  GSI ACTIVE
                </span>
              </div>
              <div className="flex items-center space-x-3 pt-1">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-full border border-emerald-500/50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <div className="text-xs">
                  <div className="font-semibold text-white">{currentUser.name}</div>
                  <div className="text-slate-400 font-mono text-[11px]">{currentUser.email}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Building className="w-3 h-3" />
                    {currentUser.agency}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-slate-800/60 border border-slate-700/70 text-xs text-slate-300 flex items-start space-x-2.5">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Forensic Examiner Authentication</span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sign in with your verified Google account to sign forensic verdicts, download official
                  tamper-evident audit dossiers, and log evidence inspection hashes.
                </p>
              </div>
            </div>
          )}

          {/* Role Specification */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
              Operational Forensic Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ANALYST', 'ADMIN', 'VIEWER'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  id={`select-role-${r.toLowerCase()}`}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                    selectedRole === r
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r}</span>
                    {selectedRole === r && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {r === 'ADMIN' ? 'All privileges' : r === 'ANALYST' ? 'Verify & sign' : 'Read only'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px]">{successMessage}</div>
            </div>
          )}

          {/* Google Sign-In Actions */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Google Sign-In API Options
            </div>

            {/* Official GSI Button Container */}
            <div
              ref={googleBtnRef}
              id="google-signin-button-container"
              className="flex justify-center min-h-[44px] w-full"
            />

            {/* Direct Google OAuth Interactive Button */}
            <button
              id="btn-google-oauth-signin"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2.5 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Connecting Google API...' : 'Sign in with Google (OAuth 2.0)'}</span>
            </button>

            {/* Direct Quick-Connect with Applet User Email */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                Or Quick Connect Examiner
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <button
              id="btn-quick-signin-user"
              onClick={() => handleQuickConnectEmail('vu.241fa04468@gmail.com', 'Examiner Vu')}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-[11px]">
                  V
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">vu.241fa04468@gmail.com</div>
                  <div className="text-[10px] text-slate-400">Border Forensic Screening Examiner</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                1-Click Connect
              </span>
            </button>
          </div>

          {/* Google Cloud Client Configuration Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfigGuide(!showConfigGuide)}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                Google Cloud Console OAuth Configuration
              </span>
              <span className="text-[10px] font-mono text-indigo-400">
                {showConfigGuide ? 'Hide Details' : 'View Settings'}
              </span>
            </button>

            {showConfigGuide && (
              <div className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-2 text-slate-300 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-sans">
                    Authorized Javascript Origins:
                  </span>
                  <div className="bg-slate-900 px-2 py-1 rounded text-indigo-300 select-all break-all mt-0.5">
                    {window.location.origin}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-sans">
                    Authorized Redirect URI:
                  </span>
                  <div className="bg-slate-900 px-2 py-1 rounded text-indigo-300 select-all break-all mt-0.5">
                    {window.location.origin}/auth/callback
                  </div>
                </div>

                <div className="pt-1 text-[10px] font-sans text-slate-400">
                  Add <code className="text-indigo-300">VITE_GOOGLE_CLIENT_ID</code> to Settings to enable your custom Google Cloud Web Client ID.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          {currentUser.authProvider ? (
            <button
              id="btn-signout-session"
              onClick={onLogout}
              className="inline-flex items-center text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out Active Session
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono">Status: Guest Examiner</span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

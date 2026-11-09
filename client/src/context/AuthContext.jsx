/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.api.js';
import { ROLE } from '../config/constants.js';
import { sessionStore } from '../storage/sessionStore.js';

const AuthContext = createContext(null);

export const AUTH_STATUS = Object.freeze({
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
});

const ANONYMOUS = { status: AUTH_STATUS.ANONYMOUS, user: null };

export function AuthProvider({ children }) {
  const [state, setState] = useState(() =>
    sessionStore.read()?.accessToken ? { status: AUTH_STATUS.LOADING, user: null } : ANONYMOUS,
  );

  // Restore a stored session by asking the server who it belongs to.
  useEffect(() => {
    if (state.status !== AUTH_STATUS.LOADING) return undefined;
    let cancelled = false;
    authApi
      .me()
      .then(({ user }) => !cancelled && setState({ status: AUTH_STATUS.AUTHENTICATED, user }))
      .catch(() => !cancelled && setState(ANONYMOUS));
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  // The HTTP layer clears the session on a 401; mirror that here.
  useEffect(() => sessionStore.subscribe(() => setState(ANONYMOUS)), []);

  const startSession = useCallback((session) => {
    sessionStore.write({ accessToken: session.accessToken });
    setState({ status: AUTH_STATUS.AUTHENTICATED, user: session.user });
  }, []);

  const signIn = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  );
  const signInAdmin = useCallback(
    async (credentials) => startSession(await authApi.adminLogin(credentials)),
    [startSession],
  );
  const signOut = useCallback(() => sessionStore.clear(), []);

  const value = useMemo(
    () => ({
      ...state,
      isCustomer: state.user?.role === ROLE.CUSTOMER,
      isAdmin: state.user?.role === ROLE.ADMIN,
      signIn,
      signInAdmin,
      signOut,
    }),
    [state, signIn, signInAdmin, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

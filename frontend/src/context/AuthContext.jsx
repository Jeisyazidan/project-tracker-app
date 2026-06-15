import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth';
import { getPermissions } from '../api/config';
import { can as checkPerm } from '../utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [rolePerms, setRolePerms] = useState({});
  const [loading, setLoading]     = useState(true);

  const loadPerms = useCallback(async () => {
    try {
      const perms = await getPermissions();
      setRolePerms(perms);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    getMe()
      .then(u => { setUser(u); return loadPerms(); })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [loadPerms]);

  const login = useCallback(async (username, password) => {
    const u = await apiLogin(username, password);
    setUser(u);
    await loadPerms();
    return u;
  }, [loadPerms]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const can = useCallback((permKey) => checkPerm(user, permKey, rolePerms), [user, rolePerms]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, rolePerms, setRolePerms }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

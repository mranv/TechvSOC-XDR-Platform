import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";

import { fetchCurrentUser, loginRequest, registerRequest } from "../api/auth";
import { clearCache } from "../api/cache";
import { setAuthToken } from "../api/http";

const STORAGE_KEY = "techvsoc-xdr-auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) {
      return;
    }

    hydrated.current = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      setBooting(false);
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(saved);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setBooting(false);
      return;
    }

    if (!parsed?.token) {
      setBooting(false);
      return;
    }

    setAuthToken(parsed.token);
    setToken(parsed.token);
    fetchCurrentUser()
      .then((currentUser) => {
        startTransition(() => {
          setUser(currentUser);
          setBooting(false);
        });
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
        startTransition(() => {
          setToken(null);
          setUser(null);
          setBooting(false);
        });
      });
  }, []);

  const persistSession = (nextToken, nextUser) => {
    clearCache();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token: nextToken, user: nextUser }),
    );
    setAuthToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = async (payload) => {
    const auth = await loginRequest(payload);
    setAuthToken(auth.access_token);
    const currentUser = await fetchCurrentUser();
    persistSession(auth.access_token, currentUser);
    return currentUser;
  };

  const register = async (payload) => {
    await registerRequest(payload);
    return login({ email: payload.email, password: payload.password });
  };

  const logout = () => {
    clearCache();
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        booting,
        isAuthenticated: Boolean(token && user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

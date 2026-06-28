import { createContext, useContext, useState, useEffect } from "react";
import { getUser, logout as authLogout, isLoggedIn } from "../services/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
    setLoading(false);
  }, []);

  function setLoggedIn(userData) {
    setUser(userData);
  }

  function logout() {
    authLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, setLoggedIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

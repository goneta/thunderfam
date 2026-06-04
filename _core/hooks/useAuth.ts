import { useCallback, useMemo } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin" | "manager";
};

export function useAuth() {
  const user = useMemo<User | null>(() => null, []);

  const logout = useCallback(() => {
    window.location.href = "/";
  }, []);

  return {
    user,
    loading: false,
    isAuthenticated: false,
    logout,
  };
}

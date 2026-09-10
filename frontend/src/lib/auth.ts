"use client";

import { useEffect, useState } from "react";

import { AUTH_EVENT, AuthUser, getStoredUser, hasSession } from "./api";

export type { AuthUser };

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}

export function useIsAuthenticated(): boolean {
  const [loggedIn, setLoggedIn] = useState(hasSession);

  useEffect(() => {
    const sync = () => setLoggedIn(hasSession());
    window.addEventListener(AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return loggedIn;
}
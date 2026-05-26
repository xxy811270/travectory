"use client";

import { create } from "zustand";

interface User {
  id: string;
  username: string;
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  checked: boolean;
  setUser: (user: User | null) => void;
  setChecked: (checked: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  checked: false,
  setUser: (user) => {
    if (user) {
      localStorage.setItem("travectory_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("travectory_user");
    }
    set({ user, checked: true });
  },
  setChecked: (checked) => set({ checked }),
  logout: () => {
    localStorage.removeItem("travectory_user");
    set({ user: null, checked: true });
  },
}));

export function getUserId(): string {
  const stored = localStorage.getItem("travectory_user");
  if (stored) {
    try { return JSON.parse(stored).id; } catch { /* ignore */ }
  }
  return "default";
}

// Initialize from localStorage
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("travectory_user");
  if (stored) {
    try {
      useAuthStore.getState().setUser(JSON.parse(stored));
    } catch {
      useAuthStore.getState().setChecked(true);
    }
  } else {
    useAuthStore.getState().setChecked(true);
  }
}

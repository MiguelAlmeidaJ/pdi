'use client';

import { useEffect, useState } from 'react';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  systemRole: 'USER' | 'MANAGER' | 'ADMIN';
};

export function useSessionUser() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('pdi_user');
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  return user;
}

"use client";

import { useState, useEffect } from "react";

export type Role = "PARENT" | "CHILD";

const KEY = "app-role";
const EVENT = "rolechange";

export function getStoredRole(): Role {
  if (typeof window === "undefined") return "PARENT";
  return (localStorage.getItem(KEY) as Role) === "CHILD" ? "CHILD" : "PARENT";
}

export function useRole(): { role: Role; setRole: (r: Role) => void; mounted: boolean } {
  const [role, setRoleState] = useState<Role>("PARENT");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRoleState(getStoredRole());
    setMounted(true);
    const handler = () => setRoleState(getStoredRole());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  function setRole(r: Role) {
    localStorage.setItem(KEY, r);
    setRoleState(r);
    window.dispatchEvent(new Event(EVENT));
  }

  return { role, setRole, mounted };
}

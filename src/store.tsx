import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Application, LetterTemplate, Profile } from "./types";
import {
  loadApps,
  loadPlatformsDone,
  loadProfile,
  loadTemplates,
  saveApps,
  savePlatformsDone,
  saveProfile,
  saveTemplates,
} from "./lib/storage";

type Store = {
  apps: Application[];
  setApps: (apps: Application[] | ((prev: Application[]) => Application[])) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  templates: LetterTemplate[];
  setTemplates: (t: LetterTemplate[]) => void;
  platformsDone: Record<string, boolean>;
  setPlatformDone: (id: string, done: boolean) => void;
  toast: string | null;
  showToast: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [apps, setAppsState] = useState<Application[]>(() => loadApps());
  const [profile, setProfileState] = useState<Profile>(() => loadProfile());
  const [templates, setTemplatesState] = useState<LetterTemplate[]>(() => loadTemplates());
  const [platformsDone, setPlatformsDoneState] = useState(() => loadPlatformsDone());
  const [toast, setToast] = useState<string | null>(null);

  const setApps = useCallback((next: Application[] | ((prev: Application[]) => Application[])) => {
    setAppsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      saveApps(value);
      return value;
    });
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  const setTemplates = useCallback((t: LetterTemplate[]) => {
    setTemplatesState(t);
    saveTemplates(t);
  }, []);

  const setPlatformDone = useCallback((id: string, done: boolean) => {
    setPlatformsDoneState((prev) => {
      const next = { ...prev, [id]: done };
      savePlatformsDone(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const value = useMemo(
    () => ({
      apps,
      setApps,
      profile,
      setProfile,
      templates,
      setTemplates,
      platformsDone,
      setPlatformDone,
      toast,
      showToast,
    }),
    [apps, setApps, profile, setProfile, templates, setTemplates, platformsDone, setPlatformDone, toast, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

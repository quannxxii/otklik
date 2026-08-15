import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Application, LetterTemplate, Profile } from "./types";
import {
  loadApps,
  loadPlatformsDone,
  loadProfile,
  loadTemplates,
  sanitizeApps,
  saveApps,
  savePlatformsDone,
  saveProfile,
  saveTemplates,
} from "./lib/storage";
import { subscribeExtPresence, subscribeExtensionSync, type ExtSyncStatus } from "./lib/ext-sync";
import { clearPro, resolvePro, savePro, stripProTemplates, visibleTemplates, type ProState } from "./lib/pro";
import { DEFAULT_PROFILE } from "./types";

type Store = {
  apps: Application[];
  setApps: (apps: Application[] | ((prev: Application[]) => Application[])) => void;
  profile: Profile;
  setProfile: (p: Profile) => void;
  templates: LetterTemplate[];
  setTemplates: (t: LetterTemplate[]) => void;
  platformsDone: Record<string, boolean>;
  setPlatformDone: (id: string, done: boolean) => void;
  isPro: boolean;
  setPro: (p: ProState) => void;
  extSync: ExtSyncStatus;
  toast: string | null;
  showToast: (msg: string) => void;
};

const Ctx = createContext<Store | null>(null);

function isProfile(x: unknown): x is Profile {
  return Boolean(x && typeof x === "object");
}

function isTemplates(x: unknown): x is LetterTemplate[] {
  return (
    Array.isArray(x) &&
    x.every(
      (t) =>
        t &&
        typeof t === "object" &&
        typeof (t as LetterTemplate).id === "string" &&
        typeof (t as LetterTemplate).title === "string" &&
        typeof (t as LetterTemplate).body === "string",
    )
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [apps, setAppsState] = useState<Application[]>(() => loadApps());
  const [profile, setProfileState] = useState<Profile>(() => loadProfile());
  const [templatesRaw, setTemplatesState] = useState<LetterTemplate[]>(() => loadTemplates());
  const [platformsDone, setPlatformsDoneState] = useState(() => loadPlatformsDone());
  const [pro, setProState] = useState<ProState>(() => loadProSafe());
  const [extSync, setExtSync] = useState<ExtSyncStatus>("checking");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void resolvePro().then((state) => {
      if (!cancelled) setProState(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setApps = useCallback((next: Application[] | ((prev: Application[]) => Application[])) => {
    setAppsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        saveApps(value);
      } catch (e) {
        window.setTimeout(() => {
          setToast(e instanceof Error ? e.message : "Не удалось сохранить");
        }, 0);
      }
      return value;
    });
  }, []);

  const setProfile = useCallback((p: Profile) => {
    setProfileState(p);
    try {
      saveProfile(p);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Не удалось сохранить профиль");
    }
  }, []);

  const setTemplates = useCallback((t: LetterTemplate[]) => {
    const cleaned = stripProTemplates(t);
    setTemplatesState(cleaned);
    try {
      saveTemplates(cleaned);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Не удалось сохранить шаблоны");
    }
  }, []);

  const setPlatformDone = useCallback((id: string, done: boolean) => {
    setPlatformsDoneState((prev) => {
      const next = { ...prev, [id]: done };
      savePlatformsDone(next);
      return next;
    });
  }, []);

  const setPro = useCallback((p: ProState) => {
    if (p.active && p.key) {
      setProState(p);
      savePro(p);
    } else {
      clearPro();
      setProState({ active: false });
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

  const templates = useMemo(
    () => visibleTemplates(templatesRaw, pro.active),
    [templatesRaw, pro.active],
  );

  useEffect(() => subscribeExtPresence(setExtSync), []);

  useEffect(() => {
    return subscribeExtensionSync((state) => {
      if (state.apps !== undefined) {
        const appsNext = sanitizeApps(state.apps);
        setAppsState(appsNext);
      }
      if (isProfile(state.profile)) {
        const incoming = state.profile;
        setProfileState((prev) => ({ ...DEFAULT_PROFILE, ...prev, ...incoming }));
      }
      if (isTemplates(state.templates) && state.templates.length) {
        setTemplatesState(stripProTemplates(state.templates));
      }
    });
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
      isPro: pro.active,
      setPro,
      extSync,
      toast,
      showToast,
    }),
    [apps, setApps, profile, setProfile, templates, setTemplates, platformsDone, setPlatformDone, pro.active, setPro, extSync, toast, showToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function loadProSafe(): ProState {
  try {
    const raw = localStorage.getItem("otklik-pro-v1");
    if (!raw) return { active: false };
    const saved = JSON.parse(raw) as ProState;
    if (!saved.key) return { active: false };
    return { active: false, key: saved.key, activatedAt: saved.activatedAt };
  } catch {
    return { active: false };
  }
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

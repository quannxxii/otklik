import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useStore } from "./store";
import { copyText } from "./lib/storage";
import { buildWeeklyDigest } from "./lib/match";
import { maybeNotifyFollowUps } from "./lib/notify";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { AppNav } from "./components/AppNav";
import { ExtSyncBadge } from "./components/ExtSyncBadge";
import { TodayPage } from "./pages/Today";
import { RadarPage } from "./pages/Radar";
import { InsightsPage } from "./pages/Insights";
import { WeekPage } from "./pages/Week";
import { CoachPage } from "./pages/Coach";
import { ProPage } from "./pages/Pro";
import { TrackerPage } from "./pages/Tracker";
import { FollowPage } from "./pages/Follow";
import { LettersPage } from "./pages/Letters";
import { PlatformsPage } from "./pages/Platforms";
import { SettingsPage } from "./pages/Settings";
import "./App.css";

export default function App() {
  const navigate = useNavigate();
  const { toast, profile, setProfile, apps, showToast, isPro, extSync } = useStore();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    maybeNotifyFollowUps(apps, profile.followDays, profile.notifyFollowUps);
  }, [apps, profile.followDays, profile.notifyFollowUps]);

  const cmdItems = [
    { id: "today", label: "Сегодня", hint: "ритм дня", run: () => navigate("/app") },
    { id: "radar", label: "Vacancy Radar", hint: "матч по вакансии", run: () => navigate("/app/radar") },
    { id: "track", label: "Трекер", hint: "таблица", run: () => navigate("/app/tracker") },
    { id: "week", label: "Неделя", hint: "собесы и тестовые", run: () => navigate("/app/week") },
    { id: "coach", label: "Коуч", hint: "разбор поиска", run: () => navigate("/app/coach") },
    { id: "insights", label: "Инсайты", hint: "воронка", run: () => navigate("/app/insights") },
    { id: "board", label: "Канбан", hint: "pipeline", run: () => navigate("/app/tracker?view=kanban") },
    { id: "follow", label: "Follow-up", hint: "кто молчит", run: () => navigate("/app/follow") },
    { id: "letters", label: "Письма", run: () => navigate("/app/letters") },
    { id: "pro", label: "Pro", hint: "оплата и ключ", run: () => navigate("/app/pro") },
    { id: "settings", label: "Профиль", run: () => navigate("/app/settings") },
    {
      id: "digest",
      label: "Недельный отчёт",
      hint: "скопировать",
      run: () => {
        void copyText(buildWeeklyDigest(apps, profile.name)).then(() => showToast("Отчёт скопирован"));
      },
    },
  ];

  return (
    <div className="app-shell">
      {!profile.onboardingDone && (
        <Onboarding
          profile={profile}
          onDone={(p) => {
            setProfile(p);
            showToast("Профиль готов — начни с первой вакансии");
          }}
        />
      )}

      <header className="app-header">
        <div className="container app-header-inner">
          <Link to="/" className="logo">Отклик</Link>
          <AppNav isPro={isPro} />
          <div className="app-header-tools">
            <ExtSyncBadge status={extSync} compact />
            <button type="button" className="btn ghost cmd-btn" onClick={() => setCmdOpen(true)}>
              ⌘K
            </button>
          </div>
        </div>
      </header>

      <main className="container app-main">
        <Routes>
          <Route index element={<TodayPage />} />
          <Route path="tracker" element={<TrackerPage />} />
          <Route path="radar" element={<RadarPage />} />
          <Route path="week" element={<WeekPage />} />
          <Route path="follow" element={<FollowPage />} />
          <Route path="coach" element={<CoachPage />} />
          <Route path="insights" element={<InsightsPage />} />
          <Route path="letters" element={<LettersPage />} />
          <Route path="pro" element={<ProPage />} />
          <Route path="platforms" element={<PlatformsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} items={cmdItems} />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

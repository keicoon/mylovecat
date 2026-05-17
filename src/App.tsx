import { useEffect, useMemo, useRef, useState } from "react";
import { Cat, ClipboardCheck, CalendarDays, LineChart, Settings, BookOpen, LayoutDashboard } from "lucide-react";
import type { AppData, CatProfile, DailyRecord, ThemeMode } from "./types";
import PublicPages, { isPublicPath } from "./PublicPages";
import { applyCustomThemeToRoot } from "./theme";
import {
  deleteCat,
  emptyData,
  findRecord,
  formatDate,
  loadData,
  makeId,
  monthKey,
  saveData,
  sortRecordsDesc,
  todayString,
  addDays,
} from "./storage";
import { shiftMonth, calculateStreak, buildVetReportText } from "./logic";
import { t } from "./i18n";
import { syncService, SyncStatus } from "./syncService";

// Components
import { LoadingView, Toast } from "./components/CommonUI";
import { InstallBanner } from "./components/InstallBanner";
import { AdUnit } from "./components/AdUnit";

// Views
import { TopBar } from "./views/TopBar";
import { SetupView } from "./views/SetupView";
import { TodayView } from "./views/TodayView";
import { CalendarView } from "./views/CalendarView";
import { TrackView } from "./views/TrackView";
import { SettingsView } from "./views/SettingsView";
import { ContextPane } from "./views/ContextPane";
import { DashboardView } from "./views/DashboardView";

type TabId = "today" | "calendar" | "dashboard" | "track" | "settings" | "info";
type ToastState = { tone: "success" | "warning" | "danger"; message: string } | null;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallContext = {
  canPrompt: boolean;
  isStandalone: boolean;
  platform: "ios-safari" | "ios-other" | "desktop" | "installed";
  title: string;
  description: string;
  steps: string[];
};

const tabs: Array<{ id: TabId; label: string; icon: any }> = [
  { id: "today", label: t("tabs.today"), icon: ClipboardCheck },
  { id: "calendar", label: t("tabs.calendar"), icon: CalendarDays },
  { id: "dashboard", label: "분석", icon: LayoutDashboard },
  { id: "track", label: t("tabs.track"), icon: LineChart },
  { id: "settings", label: t("tabs.settings"), icon: Settings },
  { id: "info", label: t("tabs.info"), icon: BookOpen },
];

function isStandaloneDisplay() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function getInstallContext(canPrompt: boolean): InstallContext {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!CriOS|FxiOS|EdgiOS|OPiOS).)*Safari/.test(userAgent);
  const isStandalone = isStandaloneDisplay();

  if (isStandalone) {
    return {
      canPrompt: false,
      isStandalone: true,
      platform: "installed",
      title: "홈 화면 앱으로 실행 중",
      description: "브라우저 주소창 없이 앱 형태로 열렸습니다.",
      steps: ["매일 기록 알림과 오프라인 사용 상태를 설정에서 확인하세요."],
    };
  }

  if (isIos && isSafari) {
    return {
      canPrompt: false,
      isStandalone: false,
      platform: "ios-safari",
      title: "iPhone 홈 화면에 추가",
      description: "Safari 공유 버튼을 통해 MyLoveCat을 앱처럼 실행할 수 있습니다.",
      steps: ["Safari 하단의 공유 버튼을 누릅니다.", "홈 화면에 추가를 선택합니다.", "이름을 확인하고 추가를 누릅니다."],
    };
  }

  if (isIos) {
    return {
      canPrompt: false,
      isStandalone: false,
      platform: "ios-other",
      title: "Safari에서 열어 설치",
      description: "iPhone의 홈 화면 추가는 Safari에서 가장 안정적으로 동작합니다.",
      steps: ["현재 주소를 복사합니다.", "Safari에서 주소를 엽니다.", "공유 버튼에서 홈 화면에 추가를 선택합니다."],
    };
  }

  return {
    canPrompt,
    isStandalone: false,
    platform: "desktop",
    title: canPrompt ? "앱으로 설치 가능" : "브라우저 설치 메뉴 확인",
    description: canPrompt ? "현재 브라우저에서 바로 설치할 수 있습니다." : "주소창이나 브라우저 메뉴의 설치 항목을 확인하세요.",
    steps: canPrompt
      ? ["설치 버튼을 누릅니다.", "브라우저 확인 창에서 설치를 선택합니다."]
      : ["Chrome 또는 Edge 주소창의 설치 아이콘을 확인합니다.", "설치 항목이 없다면 HTTPS 배포 주소에서 다시 열어보세요."],
  };
}

function normalizeAppPath(pathname: string) {
  const basePath = import.meta.env.BASE_URL;
  const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  if (cleanBasePath && pathname === cleanBasePath) return "/";
  if (basePath !== "/" && pathname.startsWith(basePath)) {
    const normalized = `/${pathname.slice(basePath.length)}`;
    return normalized !== "/" && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  }

  return pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function initialTab(): TabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((item) => item.id === tab) ? (tab as TabId) : "today";
}

export default function App() {
  const [path, setPath] = useState(() => normalizeAppPath(window.location.pathname));

  useEffect(() => {
    const syncPath = () => setPath(normalizeAppPath(window.location.pathname));

    window.addEventListener("popstate", syncPath);
    window.addEventListener("mylovecat:navigation", syncPath);
    return () => {
      window.removeEventListener("popstate", syncPath);
      window.removeEventListener("mylovecat:navigation", syncPath);
    };
  }, []);

  if (isPublicPath(path)) {
    return <PublicPages path={path} />;
  }

  return <TrackerApp />;
}

function TrackerApp() {
  const [data, setData] = useState<AppData>(() => emptyData);
  const [storageReady, setStorageReady] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [calendarMonth, setCalendarMonth] = useState(() => monthKey(todayString()));
  const [activeTab, setActiveTab] = useState<TabId>(() => initialTab());
  const [toast, setToast] = useState<ToastState>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installGuideDismissed, setInstallGuideDismissed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    signedIn: false,
    isSyncing: false,
    isConfigured: false,
  });
  const autoSelectedTodayRef = useRef(false);
  const initialSyncRef = useRef(false);
  const lastReportWeekRef = useRef(localStorage.getItem("mylovecat:last_report_week"));

  useEffect(() => {
    syncService.init(setSyncStatus);
  }, []);

  // Step 3: Gratitude Notifications & Step 4: Weekly Report
  useEffect(() => {
    if (!storageReady || !data.cats.length) return;

    // Gratitude Notification (Local Push)
    data.cats.forEach((cat) => {
      const streak = calculateStreak(data.records, cat.id);
      const notifiedKey = `mylovecat:streak_notified:${cat.id}:${streak}`;
      if ([3, 7, 30].includes(streak) && !localStorage.getItem(notifiedKey)) {
        if (Notification.permission === "granted") {
          const messages = {
            3: `벌써 3일째 기록 중! 루나가 고마워하고 있어요. 🐾`,
            7: `일주일 연속 기록 달성! 최고의 집사님이시네요. 👑`,
            30: `한 달 기록 성공! 루나와의 소중한 기록이 훈장이 되었어요. 🏅`,
          };
          new Notification("MyLoveCat", {
            body: (messages as any)[streak],
            icon: `${import.meta.env.BASE_URL}icon.svg`,
          });
          localStorage.setItem(notifiedKey, "true");
        }
      }
    });

    // Weekly Report Automation
    const today = new Date();
    const isMonday = today.getDay() === 1;
    const currentWeekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}`;

    if (
      isMonday &&
      data.settings.weeklyReportEnabled &&
      syncStatus.signedIn &&
      lastReportWeekRef.current !== currentWeekKey
    ) {
      const generateReports = async () => {
        const lastMonday = addDays(todayString(), -7);
        const lastSunday = addDays(todayString(), -1);

        let successCount = 0;
        for (const cat of data.cats) {
          const weekRecords = data.records.filter(
            (r) => r.catId === cat.id && r.date >= lastMonday && r.date <= lastSunday,
          );
          if (weekRecords.length > 0) {
            const reportText = buildVetReportText(cat, weekRecords, lastMonday, lastSunday);
            const filename = `Report_${cat.name}_${lastMonday}_to_${lastSunday}.txt`;
            const ok = await syncService.uploadReport(filename, reportText);
            if (ok) successCount++;
          }
        }

        if (successCount > 0) {
          setToast({ tone: "success", message: `지난주 리포트 ${successCount}건이 구글 드라이브에 저장되었습니다.` });
          localStorage.setItem("mylovecat:last_report_week", currentWeekKey);
          lastReportWeekRef.current = currentWeekKey;
        }
      };
      void generateReports();
    }
  }, [data.records, data.cats, data.settings.weeklyReportEnabled, syncStatus.signedIn, storageReady]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const storedData = await loadData();
        if (cancelled) return;
        
        setData(storedData);
        setSelectedCatId(storedData.cats[0]?.id ?? "");

        // Auto-sync on startup if signed in
        if (syncStatus.signedIn && !initialSyncRef.current) {
          const merged = await syncService.sync(storedData);
          if (merged && !cancelled) {
            setData(merged);
            initialSyncRef.current = true;
          }
        }
      } finally {
        if (!cancelled) setStorageReady(true);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [syncStatus.signedIn]);

  useEffect(() => {
    if (storageReady) {
      void saveData(data);
      // Auto-upload backup to cloud on changes
      if (syncStatus.signedIn) {
        void syncService.uploadOnly(data);
      }
    }
  }, [data, storageReady, syncStatus.signedIn]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const resolvedTheme = data.settings.theme === "system" ? (media.matches ? "dark" : "light") : data.settings.theme;
      const isDarkTheme = resolvedTheme === "dark";
      const customTheme = resolvedTheme === "custom" ? data.settings.customTheme : undefined;

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = isDarkTheme ? "dark" : "light";
      applyCustomThemeToRoot(document.documentElement, customTheme);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", customTheme?.colors.base ?? (isDarkTheme ? "#0e1413" : resolvedTheme === "calico" ? "#fff6f8" : "#f7f8fb"));
    };

    applyTheme();
    if (data.settings.theme !== "system") return;

    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [data.settings.customTheme, data.settings.theme]);

  useEffect(() => {
    if (!selectedCatId && data.cats[0]) setSelectedCatId(data.cats[0].id);
    if (selectedCatId && !data.cats.some((cat) => cat.id === selectedCatId)) {
      setSelectedCatId(data.cats[0]?.id ?? "");
    }
  }, [data.cats, selectedCatId]);

  useEffect(() => setCalendarMonth(monthKey(selectedDate)), [selectedDate]);

  useEffect(() => {
    if (!storageReady || autoSelectedTodayRef.current || !data.cats.length || activeTab !== "today") return;
    const today = todayString();
    if (selectedDate !== today) return;

    const firstMissingCat = data.cats.find((cat) => !findRecord(data.records, cat.id, today));
    setSelectedCatId((firstMissingCat ?? data.cats[0]).id);
    autoSelectedTodayRef.current = true;
  }, [activeTab, data.cats, data.records, selectedDate, storageReady]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return;

    const interval = window.setInterval(() => {
      const [hour, minute] = data.settings.reminderTime.split(":").map(Number);
      const now = new Date();
      const date = formatDate(now);
      if (data.settings.lastReminderDate === date) return;
      if (now.getHours() !== hour || now.getMinutes() !== minute) return;
      if (Notification.permission !== "granted") return;

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((registration) =>
            registration.showNotification("MyLoveCat", {
              body: "오늘 기록을 남길 시간이에요.",
              icon: `${import.meta.env.BASE_URL}icon.svg`,
              badge: `${import.meta.env.BASE_URL}favicon.svg`,
              tag: "mylovecat-daily-reminder",
            }),
          )
          .catch(() => new Notification("MyLoveCat", { body: "오늘 기록을 남길 시간이에요." }));
      } else {
        new Notification("MyLoveCat", { body: "오늘 기록을 남길 시간이에요." });
      }

      setData((current) => ({
        ...current,
        settings: { ...current.settings, lastReminderDate: date },
      }));
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [data.settings.lastReminderDate, data.settings.reminderTime]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedCat = data.cats.find((cat) => cat.id === selectedCatId);
  const selectedRecords = useMemo(
    () => data.records.filter((record) => record.catId === selectedCatId).sort(sortRecordsDesc),
    [data.records, selectedCatId],
  );

  const openInstallPrompt = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const installContext = getInstallContext(Boolean(installPrompt));
  const showInstallGuide = !installGuideDismissed && !installContext.isStandalone && (installContext.canPrompt || installContext.platform !== "desktop");

  const addCat = (cat: Omit<CatProfile, "id">) => {
    const nextCat = { ...cat, id: makeId("cat") };
    setData((current) => ({ ...current, cats: [...current.cats, nextCat] }));
    setSelectedCatId(nextCat.id);
    setActiveTab("today");
    setToast({ tone: "success", message: `${nextCat.name} 프로필을 추가했어요.` });
  };

  const updateCat = (cat: CatProfile) => {
    setData((current) => ({
      ...current,
      cats: current.cats.map((item) => (item.id === cat.id ? cat : item)),
    }));
    setToast({ tone: "success", message: `${cat.name} 프로필을 저장했어요.` });
  };

  const removeCat = (catId: string) => {
    const cat = data.cats.find((item) => item.id === catId);
    if (!cat) return;
    if (!window.confirm(`${cat.name}의 프로필과 기록을 삭제할까요?`)) return;
    setData((current) => deleteCat(current, catId));
    setToast({ tone: "danger", message: `${cat.name} 데이터를 삭제했어요.` });
  };

  const changeTab = (tab: TabId) => {
    if (tab === "info") {
      const infoPath = "/about";
      window.history.pushState(null, "", infoPath);
      window.dispatchEvent(new CustomEvent("mylovecat:navigation"));
      return;
    }
    setActiveTab(tab);
    window.history.replaceState(null, "", `?tab=${tab}`);
  };

  return (
    <div className="app-shell">
      <aside className="rail" aria-label="주요 메뉴">
        <div className="brand-mark" title="MyLoveCat">
          <Cat aria-hidden="true" size={24} />
        </div>
        <nav className="rail-nav">
          {tabs.map((tab) => (
            <button
              className={`nav-button ${activeTab === tab.id ? "is-active" : ""}`}
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              title={tab.label}
              aria-label={tab.label}
            >
              <tab.icon size={21} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <TopBar
          cats={data.cats}
          records={data.records}
          selectedCatId={selectedCatId}
          selectedDate={selectedDate}
          onSelectCat={setSelectedCatId}
          onDateChange={setSelectedDate}
          onAddCat={() => setActiveTab("settings")}
          installPromptAvailable={Boolean(installPrompt)}
          onInstall={openInstallPrompt}
          syncStatus={syncStatus}
        />

        {showInstallGuide ? (
          <InstallBanner
            context={installContext}
            onDismiss={() => setInstallGuideDismissed(true)}
            onInstall={openInstallPrompt}
          />
        ) : null}

        {!storageReady ? (
          <LoadingView />
        ) : data.cats.length === 0 && (activeTab === "today" || activeTab === "calendar" || activeTab === "track" || activeTab === "dashboard") ? (
          <SetupView onAddCat={addCat} />
        ) : (
          <>
            {activeTab === "today" && selectedCat && (
              <TodayView
                cat={selectedCat}
                cats={data.cats}
                data={data}
                selectedDate={selectedDate}
                selectedCatId={selectedCatId}
                onSelectCat={setSelectedCatId}
                onSaveData={setData}
                onToast={setToast}
              />
            )}
            {activeTab === "calendar" && selectedCat && (
              <CalendarView
                cat={selectedCat}
                records={selectedRecords}
                month={calendarMonth}
                selectedDate={selectedDate}
                onMonthChange={setCalendarMonth}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  setActiveTab("today");
                }}
              />
            )}
            {activeTab === "dashboard" && selectedCat && (
              <div className="dashboard-layout">
                <DashboardView cat={selectedCat} records={selectedRecords} />
              </div>
            )}
            {activeTab === "track" && selectedCat && (
              <div className="track-layout">
                <TrackView cat={selectedCat} records={selectedRecords} selectedDate={selectedDate} onToast={setToast} />
                <AdUnit label="추적 페이지 하단 광고" />
              </div>
            )}
            {activeTab === "settings" && (
              <div className="settings-layout">
                <SettingsView
                  data={data}
                  selectedDate={selectedDate}
                  onAddCat={addCat}
                  onUpdateCat={updateCat}
                  onDeleteCat={removeCat}
                  onDataChange={setData}
                  onToast={setToast}
                  installPromptAvailable={Boolean(installPrompt)}
                  installContext={installContext}
                  onInstall={openInstallPrompt}
                />
                <AdUnit label="설정 페이지 하단 광고" />
              </div>
            )}
          </>
        )}
      </main>

      {data.cats.length > 0 && selectedCat ? (
        <ContextPane cat={selectedCat} selectedDate={selectedDate} records={selectedRecords} />
      ) : null}

      <nav className="bottom-nav" aria-label="모바일 메뉴">
        {tabs.map((tab) => (
          <button
            className={`bottom-nav-button ${activeTab === tab.id ? "is-active" : ""}`}
            key={tab.id}
            onClick={() => changeTab(tab.id)}
            aria-label={tab.label}
          >
            <tab.icon size={21} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {toast ? <Toast toast={toast} /> : null}
    </div>
  );
}

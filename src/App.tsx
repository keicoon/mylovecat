import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  Activity,
  Bell,
  Camera,
  CalendarDays,
  Cat,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Download,
  Droplets,
  HeartPulse,
  Image as ImageIcon,
  LineChart,
  Monitor,
  Moon,
  Palette,
  PawPrint,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Utensils,
  Weight,
  X,
} from "lucide-react";
import type {
  AppData,
  CatProfile,
  CatSex,
  ConditionValue,
  CustomTheme,
  DailyRecord,
  ImageAsset,
  MonthlyExport,
  RecordField,
  RecordItems,
  RelativeValue,
  ThemeMode,
} from "./types";
import PublicPages, { isPublicPath } from "./PublicPages";
import { recordFieldLabels } from "./types";
import { advancedRecordFieldOrder, coreRecordFieldOrder } from "./types";
import {
  applyCustomThemeToRoot,
  buildThemeTemplate,
  normalizeCustomTheme,
  themeColorKeys,
  themeColorLabels,
} from "./theme";
import {
  addDays,
  buildMonthlyExport,
  compactItems,
  deleteCat,
  downloadJson,
  emptyData,
  filledCoreCount,
  findRecord,
  formatDate,
  loadData,
  makeId,
  mergeMonthlyExport,
  missingCoreFields,
  monthKey,
  monthStartWeekday,
  parseDate,
  readImageAsset,
  estimateStorageUsage,
  requestPersistentStorage,
  saveData,
  sortRecordsDesc,
  todayString,
  upsertRecord,
} from "./storage";

type TabId = "today" | "calendar" | "track" | "settings";
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

const tabs: Array<{ id: TabId; label: string; icon: typeof ClipboardCheck }> = [
  { id: "today", label: "기록", icon: ClipboardCheck },
  { id: "calendar", label: "캘린더", icon: CalendarDays },
  { id: "track", label: "추적", icon: LineChart },
  { id: "settings", label: "설정", icon: Settings },
];

const relativeOptions: Array<{ value: RelativeValue; label: string }> = [
  { value: "decreased", label: "감소" },
  { value: "same", label: "비슷" },
  { value: "increased", label: "증가" },
];

const conditionOptions: Array<{ value: ConditionValue; label: string }> = [
  { value: "bad", label: "나쁨" },
  { value: "normal", label: "보통" },
  { value: "good", label: "좋음" },
];

const countOptions = [
  { value: 0 as const, label: "0" },
  { value: 1 as const, label: "1" },
  { value: 2 as const, label: "2" },
  { value: 3 as const, label: "3" },
  { value: 4 as const, label: "4+" },
];

const quickCopyFields: RecordField[] = [
  "appetite",
  "waterIntake",
  "stoolCount",
  "urineCount",
  "activity",
  "medicationTaken",
  "foodSnackAmount",
  "condition",
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
  const autoSelectedTodayRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    loadData()
      .then((storedData) => {
        if (cancelled) return;
        setData(storedData);
        setSelectedCatId(storedData.cats[0]?.id ?? "");
      })
      .finally(() => {
        if (!cancelled) setStorageReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (storageReady) void saveData(data);
  }, [data, storageReady]);

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
          selectedCatId={selectedCatId}
          selectedDate={selectedDate}
          onSelectCat={setSelectedCatId}
          onDateChange={setSelectedDate}
          onAddCat={() => setActiveTab("settings")}
          installPromptAvailable={Boolean(installPrompt)}
          onInstall={openInstallPrompt}
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
        ) : data.cats.length === 0 ? (
          <SetupView onAddCat={addCat} />
        ) : selectedCat ? (
          <>
            {activeTab === "today" && (
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
            {activeTab === "calendar" && (
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
            {activeTab === "track" && (
              <TrackView cat={selectedCat} records={selectedRecords} selectedDate={selectedDate} onToast={setToast} />
            )}
            {activeTab === "settings" && (
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
            )}
          </>
        ) : null}
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

function TopBar({
  cats,
  selectedCatId,
  selectedDate,
  onSelectCat,
  onDateChange,
  onAddCat,
  installPromptAvailable,
  onInstall,
}: {
  cats: CatProfile[];
  selectedCatId: string;
  selectedDate: string;
  onSelectCat: (catId: string) => void;
  onDateChange: (date: string) => void;
  onAddCat: () => void;
  installPromptAvailable: boolean;
  onInstall: () => void;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">MyLoveCat</div>
        <h1>오늘의 고양이 기록</h1>
      </div>
      <div className="topbar-actions">
        <input
          className="date-input"
          type="date"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
          aria-label="기록 날짜"
        />
        {installPromptAvailable ? (
          <button className="icon-button" onClick={onInstall} title="앱 설치" aria-label="앱 설치">
            <Download size={19} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="cat-strip" aria-label="고양이 선택">
        {cats.map((cat) => (
          <button
            className={`cat-chip ${selectedCatId === cat.id ? "is-active" : ""}`}
            key={cat.id}
            onClick={() => onSelectCat(cat.id)}
          >
            <CatAvatar cat={cat} size="chip" />
            {cat.name}
          </button>
        ))}
        <button className="cat-chip add" onClick={onAddCat}>
          <Plus size={16} aria-hidden="true" />
          추가
        </button>
      </div>
    </header>
  );
}

function InstallBanner({
  context,
  onInstall,
  onDismiss,
}: {
  context: InstallContext;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="install-banner" aria-label="앱 설치 안내">
      <div className="install-banner-icon">
        <Smartphone size={22} aria-hidden="true" />
      </div>
      <div>
        <strong>{context.title}</strong>
        <p>{context.description}</p>
        <ol>
          {context.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="install-banner-actions">
        {context.canPrompt ? (
          <button className="primary-button" onClick={onInstall}>
            <Download size={18} aria-hidden="true" />
            설치
          </button>
        ) : null}
        <button className="icon-button" onClick={onDismiss} aria-label="설치 안내 닫기">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function SetupView({ onAddCat }: { onAddCat: (cat: Omit<CatProfile, "id">) => void }) {
  return (
    <section className="setup-grid">
      <div className="setup-copy">
        <div className="brand-mark large">
          <Cat aria-hidden="true" size={34} />
        </div>
        <h2>고양이 프로필을 추가하세요.</h2>
        <p>첫 기록을 시작할 준비가 됩니다.</p>
      </div>
      <CatForm submitLabel="프로필 추가" onSubmit={onAddCat} />
    </section>
  );
}

function LoadingView() {
  return (
    <section className="panel loading-panel">
      <div className="loading-mark" />
      <h2>기록을 불러오는 중</h2>
    </section>
  );
}

function TodayView({
  cat,
  cats,
  data,
  selectedDate,
  selectedCatId,
  onSelectCat,
  onSaveData,
  onToast,
}: {
  cat: CatProfile;
  cats: CatProfile[];
  data: AppData;
  selectedDate: string;
  selectedCatId: string;
  onSelectCat: (catId: string) => void;
  onSaveData: (updater: (current: AppData) => AppData) => void;
  onToast: (toast: ToastState) => void;
}) {
  const currentRecord = findRecord(data.records, cat.id, selectedDate);
  const yesterdayRecord = findRecord(data.records, cat.id, addDays(selectedDate, -1));
  const [draft, setDraft] = useState<RecordItems>(() => currentRecord?.items ?? {});

  useEffect(() => {
    setDraft(currentRecord?.items ?? {});
  }, [cat.id, currentRecord?.updatedAt, selectedDate]);

  const compacted = compactItems(draft);
  const missing = missingCoreFields(compacted);
  const completion = Math.round((filledCoreCount(compacted) / coreRecordFieldOrder.length) * 100);
  const attention = getAttentionItems({ id: "", catId: cat.id, date: selectedDate, createdAt: "", updatedAt: "", items: compacted });

  const setItem = <K extends keyof RecordItems>(key: K, value: RecordItems[K] | undefined) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const fillFromYesterday = () => {
    if (!yesterdayRecord) {
      onToast({ tone: "warning", message: "어제 기록이 아직 없어요." });
      return;
    }

    const copied: RecordItems = {};
    for (const key of quickCopyFields) {
      const value = yesterdayRecord.items[key];
      if (value !== undefined) Object.assign(copied, { [key]: value });
    }

    setDraft((current) => ({ ...current, ...copied }));
    onToast({ tone: "success", message: "어제 기록을 기준으로 채웠어요." });
  };

  const saveRecord = () => {
    const items = compactItems(draft);
    const now = new Date().toISOString();
    const record: DailyRecord = currentRecord
      ? { ...currentRecord, items, updatedAt: now }
      : {
          id: `record_${cat.id}_${selectedDate}`,
          catId: cat.id,
          date: selectedDate,
          createdAt: now,
          updatedAt: now,
          items,
        };

    onSaveData((current) => ({
      ...current,
      records: upsertRecord(current.records, record),
    }));

    const missingNames = missingCoreFields(items).map((field) => recordFieldLabels[field]);
    if (missingNames.length) {
      const preview = missingNames.slice(0, 4).join(", ");
      onToast({
        tone: "warning",
        message: `저장했어요. 미입력 ${missingNames.length}개: ${preview}${missingNames.length > 4 ? " 외" : ""}`,
      });
      return;
    }

    onToast({ tone: "success", message: "저장했어요. 오늘 기록이 채워졌어요." });
  };

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const currentPhotos = draft.photos ?? [];
    const remaining = Math.max(0, 4 - currentPhotos.length);
    if (!remaining) {
      onToast({ tone: "warning", message: "사진은 하루 기록당 4장까지 추가할 수 있어요." });
      return;
    }

    try {
      const assets = await Promise.all(
        files.slice(0, remaining).map((file) => readImageAsset(file, { maxEdge: 900, quality: 0.78 })),
      );
      setItem("photos", [...currentPhotos, ...assets]);
      onToast({ tone: "success", message: `사진 ${assets.length}장을 추가했어요.` });
    } catch (error) {
      onToast({ tone: "danger", message: error instanceof Error ? error.message : "사진 추가에 실패했어요." });
    }
  };

  const removePhoto = (photoId: string) => {
    const nextPhotos = (draft.photos ?? []).filter((photo) => photo.id !== photoId);
    setItem("photos", nextPhotos.length ? nextPhotos : undefined);
  };

  return (
    <section className="today-layout">
      <DailyOverview
        cats={cats}
        records={data.records}
        selectedDate={selectedDate}
        selectedCatId={selectedCatId}
        onSelectCat={onSelectCat}
      />
      <div className="panel record-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{cat.name}</p>
            <h2>{formatKoreanDate(selectedDate)}</h2>
          </div>
          <div className="completion" style={{ "--progress": `${completion}%` } as CSSProperties}>
            <span>{completion}%</span>
          </div>
        </div>

        <div className="quick-actions">
          <button className="soft-button" onClick={fillFromYesterday}>
            <RotateCcw size={18} aria-hidden="true" />
            어제와 비슷하게
          </button>
          <div className={`inline-status ${attention.length ? "warning" : "calm"}`}>
            {attention.length ? <CircleAlert size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
            {attention.length ? `주의 ${attention.length}` : "특이점 없음"}
          </div>
        </div>

        <MobileStepInput items={draft} onSetItem={setItem} />

        <div className="field-grid desktop-fields">
          {coreRecordFieldOrder.map((field) => (
            <RecordInputField field={field} items={draft} key={field} onSetItem={setItem} />
          ))}
        </div>

        <details className="advanced-panel">
          <summary>
            <span>확장 기록</span>
            <small>구토, 체중, 약 복용</small>
          </summary>
          <div className="field-grid">
            {advancedRecordFieldOrder.map((field) => (
              <RecordInputField field={field} items={draft} key={field} onSetItem={setItem} />
            ))}
          </div>
        </details>

        <div className="detail-panel">
          <div className="detail-head">
            <div>
              <p className="eyebrow">Special note</p>
              <h3>특이사항</h3>
            </div>
            <label className="soft-button file-button">
              <Camera size={18} aria-hidden="true" />
              사진 추가
              <input type="file" accept="image/*" multiple onChange={addPhotos} />
            </label>
          </div>
          <textarea
            className="note-input"
            maxLength={500}
            placeholder="예: 아침에 구토 1회, 식욕이 평소보다 떨어짐"
            value={draft.note ?? ""}
            onChange={(event) => setItem("note", event.target.value || undefined)}
          />
          {draft.photos?.length ? (
            <ImageGrid images={draft.photos} onRemove={removePhoto} />
          ) : (
            <p className="helper-text">
              <ImageIcon size={16} aria-hidden="true" />
              사진은 최대 4장까지 저장됩니다.
            </p>
          )}
        </div>

        <div className="record-footer">
          <p>{missing.length ? `미입력 ${missing.length}개가 있어요.` : "모든 항목이 입력됐어요."}</p>
          <button className="primary-button" onClick={saveRecord}>
            <Save size={19} aria-hidden="true" />
            저장
          </button>
        </div>
      </div>
    </section>
  );
}

function CalendarView({
  cat,
  records,
  month,
  selectedDate,
  onMonthChange,
  onDateSelect,
}: {
  cat: CatProfile;
  records: DailyRecord[];
  month: string;
  selectedDate: string;
  onMonthChange: (month: string) => void;
  onDateSelect: (date: string) => void;
}) {
  const recordMap = new Map(records.filter((record) => record.date.startsWith(month)).map((record) => [record.date, record]));
  const firstWeekday = monthStartWeekday(month);
  const dayCount = Number(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate());
  const cells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ type: "blank" as const, key: `blank-${index}` })),
    ...Array.from({ length: dayCount }, (_, index) => {
      const day = `${index + 1}`.padStart(2, "0");
      const date = `${month}-${day}`;
      return { type: "day" as const, key: date, date };
    }),
  ];

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{cat.name}</p>
          <h2>월간 캘린더</h2>
        </div>
        <div className="month-nav">
          <button className="icon-button" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="이전 달">
            <ChevronLeft size={19} aria-hidden="true" />
          </button>
          <strong>{month}</strong>
          <button className="icon-button" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="다음 달">
            <ChevronRight size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="weekday-grid" aria-hidden="true">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => {
          if (cell.type === "blank") return <div className="calendar-cell blank" key={cell.key} />;

          const record = recordMap.get(cell.date);
          const alerts = record ? getAttentionItems(record) : [];
          const complete = record ? filledCoreCount(record.items) : 0;

          return (
            <button
              className={`calendar-cell ${selectedDate === cell.date ? "is-selected" : ""} ${
                record ? "has-record" : ""
              } ${alerts.length ? "has-alert" : ""}`}
              key={cell.date}
              onClick={() => onDateSelect(cell.date)}
            >
              <span>{Number(cell.date.slice(8, 10))}</span>
              {record ? (
                <small>
                  {alerts.length
                    ? `주의 ${alerts.length}`
                    : record.items.note || record.items.photos?.length
                      ? "특이사항"
                      : `${complete}/${coreRecordFieldOrder.length}`}
                </small>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TrackView({
  cat,
  records,
  selectedDate,
  onToast,
}: {
  cat: CatProfile;
  records: DailyRecord[];
  selectedDate: string;
  onToast: (toast: ToastState) => void;
}) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const oldestDate = addDays(selectedDate, -(range - 1));
  const visible = records
    .filter((record) => record.date >= oldestDate && record.date <= selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = [...visible].reverse().find((record) => record.items.weightKg !== undefined)?.items.weightKg;
  const alertDays = visible.filter((record) => getAttentionItems(record).length).length;
  const vomitCount = visible.filter((record) => record.items.vomit).length;

  return (
    <section className="track-grid">
      <div className="panel span-2">
        <div className="panel-head">
          <div>
            <p className="eyebrow">{cat.name}</p>
            <h2>상태 추적</h2>
          </div>
          <Segmented
            value={range}
            options={[
              { value: 7 as const, label: "7일" },
              { value: 30 as const, label: "30일" },
              { value: 90 as const, label: "90일" },
            ]}
            onChange={setRange}
          />
        </div>
        <div className="kpi-row">
          <Kpi label="기록일" value={`${visible.length}일`} />
          <Kpi label="주의일" value={`${alertDays}일`} tone={alertDays ? "warning" : "calm"} />
          <Kpi label="구토" value={`${vomitCount}회`} tone={vomitCount ? "danger" : "calm"} />
          <Kpi label="최근 체중" value={latestWeight ? `${latestWeight}kg` : "-"} />
        </div>
      </div>

      <VetReportPanel cat={cat} records={visible} fromDate={oldestDate} toDate={selectedDate} onToast={onToast} />

      <div className="panel span-2">
        <div className="panel-head compact">
          <h3>체중 흐름</h3>
        </div>
        <WeightChart records={visible} />
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h3>타임라인</h3>
        </div>
        <div className="timeline">
          {[...visible].reverse().map((record) => (
            <TimelineItem key={record.id} record={record} />
          ))}
          {!visible.length ? <EmptyLine text="선택한 기간에 기록이 없어요." /> : null}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h3>표 보기</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>날짜</th>
                <th>식욕</th>
                <th>물</th>
                <th>배변</th>
                <th>소변</th>
                <th>구토</th>
                <th>컨디션</th>
                <th>메모</th>
                <th>사진</th>
              </tr>
            </thead>
            <tbody>
              {[...visible].reverse().map((record) => (
                <tr key={record.id}>
                  <td>{record.date.slice(5)}</td>
                  <td>{formatRelative(record.items.appetite)}</td>
                  <td>{formatRelative(record.items.waterIntake)}</td>
                  <td>{formatCount(record.items.stoolCount)}</td>
                  <td>{formatCount(record.items.urineCount)}</td>
                  <td>{record.items.vomit === undefined ? "-" : record.items.vomit ? "있음" : "없음"}</td>
                  <td>{formatCondition(record.items.condition)}</td>
                  <td>{record.items.note ? "있음" : "-"}</td>
                  <td>{record.items.photos?.length ? `${record.items.photos.length}장` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function VetReportPanel({
  cat,
  records,
  fromDate,
  toDate,
  onToast,
}: {
  cat: CatProfile;
  records: DailyRecord[];
  fromDate: string;
  toDate: string;
  onToast: (toast: ToastState) => void;
}) {
  const reportText = buildVetReportText(cat, records, fromDate, toDate);
  const attentionCounts = countAttentionItems(records);
  const latestWeight = [...records].reverse().find((record) => record.items.weightKg !== undefined)?.items.weightKg;
  const noteRecords = records.filter((record) => record.items.note || record.items.photos?.length);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      onToast({ tone: "success", message: "수의사 공유 요약을 복사했어요." });
    } catch {
      onToast({ tone: "warning", message: "클립보드 복사 권한이 필요해요." });
    }
  };

  const shareReport = async () => {
    if (!navigator.share) {
      await copyReport();
      return;
    }

    try {
      await navigator.share({
        title: `MyLoveCat ${cat.name} 리포트`,
        text: reportText,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      onToast({ tone: "warning", message: "공유를 완료하지 못했어요." });
    }
  };

  const printReport = () => {
    document.body.classList.add("is-printing-report");
    const cleanup = () => document.body.classList.remove("is-printing-report");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => window.print(), 60);
    window.setTimeout(cleanup, 1800);
  };

  return (
    <section className="panel span-2 vet-report-panel report-print-area">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Vet report</p>
          <h2>수의사 공유 리포트</h2>
        </div>
        <div className="report-actions no-print">
          <button className="soft-button" onClick={copyReport}>
            <Copy size={18} aria-hidden="true" />
            복사
          </button>
          <button className="soft-button" onClick={shareReport}>
            <Share2 size={18} aria-hidden="true" />
            공유
          </button>
          <button className="primary-button" onClick={printReport}>
            <Printer size={18} aria-hidden="true" />
            인쇄/PDF
          </button>
        </div>
      </div>

      <div className="report-cover">
        <CatAvatar cat={cat} size="large" />
        <div>
          <h3>{cat.name}</h3>
          <p>
            {cat.ageYears ?? "-"}세 · {formatSex(cat.sex)} · {cat.neutered ? "중성화" : "미중성화"} · {fromDate} - {toDate}
          </p>
        </div>
      </div>

      <div className="kpi-row report-kpis">
        <Kpi label="기록일" value={`${records.length}일`} />
        <Kpi label="주의 항목" value={`${Object.values(attentionCounts).reduce((sum, count) => sum + count, 0)}개`} tone="warning" />
        <Kpi label="메모/사진" value={`${noteRecords.length}일`} />
        <Kpi label="최근 체중" value={latestWeight ? `${latestWeight}kg` : "-"} />
      </div>

      <div className="report-section">
        <h3>주의 항목 요약</h3>
        {Object.keys(attentionCounts).length ? (
          <div className="report-tags">
            {Object.entries(attentionCounts).map(([label, count]) => (
              <span key={label}>
                {label} {count}
              </span>
            ))}
          </div>
        ) : (
          <EmptyLine text="선택한 기간에 주의 항목이 없어요." />
        )}
      </div>

      <div className="report-section">
        <h3>최근 특이사항</h3>
        {noteRecords.length ? (
          <div className="report-notes">
            {noteRecords
              .slice()
              .reverse()
              .slice(0, 6)
              .map((record) => (
                <article key={record.id}>
                  <strong>{record.date}</strong>
                  {record.items.note ? <p>{record.items.note}</p> : null}
                  {record.items.photos?.length ? <small>사진 {record.items.photos.length}장</small> : null}
                </article>
              ))}
          </div>
        ) : (
          <EmptyLine text="메모나 사진이 있는 기록이 없어요." />
        )}
      </div>

      <div className="table-wrap report-table-wrap">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>식욕</th>
              <th>물</th>
              <th>배변</th>
              <th>소변</th>
              <th>구토</th>
              <th>활동</th>
              <th>컨디션</th>
              <th>체중</th>
              <th>주의</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td>{formatRelative(record.items.appetite)}</td>
                <td>{formatRelative(record.items.waterIntake)}</td>
                <td>{formatCount(record.items.stoolCount)}</td>
                <td>{formatCount(record.items.urineCount)}</td>
                <td>{record.items.vomit === undefined ? "-" : record.items.vomit ? "있음" : "없음"}</td>
                <td>{formatRelative(record.items.activity)}</td>
                <td>{formatCondition(record.items.condition)}</td>
                <td>{record.items.weightKg ? `${record.items.weightKg}kg` : "-"}</td>
                <td>{getAttentionItems(record).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SettingsView({
  data,
  selectedDate,
  onAddCat,
  onUpdateCat,
  onDeleteCat,
  onDataChange,
  onToast,
  installPromptAvailable,
  installContext,
  onInstall,
}: {
  data: AppData;
  selectedDate: string;
  onAddCat: (cat: Omit<CatProfile, "id">) => void;
  onUpdateCat: (cat: CatProfile) => void;
  onDeleteCat: (catId: string) => void;
  onDataChange: (updater: (current: AppData) => AppData) => void;
  onToast: (toast: ToastState) => void;
  installPromptAvailable: boolean;
  installContext: InstallContext;
  onInstall: () => void;
}) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [storageText, setStorageText] = useState("계산 전");
  const editingCat = data.cats.find((cat) => cat.id === editingCatId);
  const exportMonth = monthKey(selectedDate);

  useEffect(() => {
    estimateStorageUsage()
      .then((estimate) => {
        if (!estimate?.usage) {
          setStorageText("확인 불가");
          return;
        }

        setStorageText(`${formatBytes(estimate.usage)} 사용 중`);
      })
      .catch(() => setStorageText("확인 불가"));
  }, [data]);

  const handleExport = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
    const payload = buildMonthlyExport(data, exportMonth, timezone);
    downloadJson(`mylovecat-records-${exportMonth}.json`, payload);
    onToast({ tone: "success", message: `${exportMonth} 기록을 내보냈어요.` });
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as MonthlyExport;
      onDataChange((current) => mergeMonthlyExport(current, parsed));
      onToast({ tone: "success", message: "기록 파일을 가져왔어요." });
    } catch (error) {
      onToast({ tone: "danger", message: error instanceof Error ? error.message : "가져오기에 실패했어요." });
    } finally {
      event.target.value = "";
    }
  };

  const handleThemeImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const theme = normalizeCustomTheme(JSON.parse(text));
      if (!theme) throw new Error("지원하지 않는 테마 파일입니다.");
      onDataChange((current) => ({
        ...current,
        settings: { ...current.settings, theme: "custom", customTheme: theme },
      }));
      onToast({ tone: "success", message: `${theme.name} 테마를 적용했어요.` });
    } catch (error) {
      onToast({ tone: "danger", message: error instanceof Error ? error.message : "테마 가져오기에 실패했어요." });
    } finally {
      event.target.value = "";
    }
  };

  const handleThemeExport = () => {
    const theme = data.settings.customTheme ?? buildThemeTemplate();
    downloadJson(`mylovecat-theme-${theme.name.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-")}.json`, theme);
    onToast({ tone: "success", message: "테마 JSON을 내보냈어요." });
  };

  const requestNotification = async () => {
    if (!("Notification" in window)) {
      onToast({ tone: "warning", message: "이 브라우저는 알림을 지원하지 않아요." });
      return;
    }

    const permission = await Notification.requestPermission();
    onToast({
      tone: permission === "granted" ? "success" : "warning",
      message: permission === "granted" ? "알림 권한을 허용했어요." : "알림 권한이 필요해요.",
    });
  };

  const protectStorage = async () => {
    const persisted = await requestPersistentStorage();

    if (persisted === undefined) {
      onToast({ tone: "warning", message: "이 브라우저는 저장소 보호 요청을 지원하지 않아요." });
      return;
    }

    onToast({
      tone: persisted ? "success" : "warning",
      message: persisted ? "브라우저 저장소 보호가 적용됐어요." : "브라우저가 저장소 보호 요청을 거부했어요.",
    });
  };

  return (
    <section className="settings-grid">
      <div className="panel">
        <div className="panel-head compact">
          <h2>{editingCat ? "프로필 수정" : "프로필 추가"}</h2>
        </div>
        <CatForm
          key={editingCat?.id ?? "new-cat"}
          initial={editingCat}
          submitLabel={editingCat ? "수정 저장" : "프로필 추가"}
          onSubmit={(cat) => {
            if (editingCat) {
              onUpdateCat({ ...cat, id: editingCat.id });
              setEditingCatId(null);
            } else {
              onAddCat(cat);
            }
          }}
          onCancel={editingCat ? () => setEditingCatId(null) : undefined}
        />
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>고양이</h2>
        </div>
        <div className="cat-list">
          {data.cats.map((cat) => (
            <div className="cat-row" key={cat.id}>
              <div>
                <strong>{cat.name}</strong>
                <span>
                  {cat.ageYears ?? "-"}세 · {formatSex(cat.sex)} · {cat.neutered ? "중성화" : "미중성화"}
                </span>
              </div>
              <div className="row-actions">
                <button className="icon-button" onClick={() => setEditingCatId(cat.id)} aria-label={`${cat.name} 수정`}>
                  <Settings size={18} aria-hidden="true" />
                </button>
                <button className="icon-button danger" onClick={() => onDeleteCat(cat.id)} aria-label={`${cat.name} 삭제`}>
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>알림</h2>
        </div>
        <div className="setting-line">
          <label htmlFor="reminder">기록 시간</label>
          <input
            id="reminder"
            className="date-input"
            type="time"
            value={data.settings.reminderTime}
            onChange={(event) =>
              onDataChange((current) => ({
                ...current,
                settings: { ...current.settings, reminderTime: event.target.value },
              }))
            }
          />
        </div>
        <button className="soft-button" onClick={requestNotification}>
          <Bell size={18} aria-hidden="true" />
          알림 허용
        </button>
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>화면</h2>
        </div>
        <div className="theme-control">
          <Segmented
            value={data.settings.theme}
            options={[
              { value: "system" as const, label: "자동" },
              { value: "light" as const, label: "라이트" },
              { value: "dark" as const, label: "다크" },
              { value: "calico" as const, label: "고양이" },
              { value: "custom" as const, label: "커스텀" },
            ]}
            onChange={(theme: ThemeMode) =>
              onDataChange((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  theme,
                  customTheme: theme === "custom" ? current.settings.customTheme ?? buildThemeTemplate() : current.settings.customTheme,
                },
              }))
            }
          />
          <div className="theme-preview" aria-hidden="true">
            <Monitor size={18} />
            <Sun size={18} />
            <Moon size={18} />
            <Sparkles size={18} />
          </div>
          <ThemeSwatches theme={data.settings.customTheme} />
          <div className="button-stack">
            <label className="soft-button file-button">
              <Palette size={18} aria-hidden="true" />
              테마 가져오기
              <input type="file" accept="application/json" onChange={handleThemeImport} />
            </label>
            <button className="soft-button" onClick={handleThemeExport}>
              <Download size={18} aria-hidden="true" />
              테마 내보내기
            </button>
          </div>
        </div>
      </div>

      <InstallGuideCard context={installContext} installPromptAvailable={installPromptAvailable} onInstall={onInstall} />

      <div className="panel">
        <div className="panel-head compact">
          <h2>데이터</h2>
        </div>
        <div className="storage-meter">
          <span>로컬 저장소</span>
          <strong>{storageText}</strong>
        </div>
        <div className="button-stack">
          <button className="soft-button" onClick={protectStorage}>
            <ShieldCheck size={18} aria-hidden="true" />
            저장소 보호
          </button>
          <button className="soft-button" onClick={handleExport}>
            <Download size={18} aria-hidden="true" />
            {exportMonth} 내보내기
          </button>
          <label className="soft-button file-button">
            <Upload size={18} aria-hidden="true" />
            JSON 가져오기
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
          {installPromptAvailable ? (
            <button className="soft-button" onClick={onInstall}>
              <Download size={18} aria-hidden="true" />앱 설치
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ThemeSwatches({ theme }: { theme?: CustomTheme }) {
  const colors = theme?.colors ?? buildThemeTemplate().colors;

  return (
    <div className="theme-swatches" aria-label="커스텀 테마 색상 미리보기">
      {themeColorKeys.slice(0, 8).map((key) => (
        <span key={key} title={themeColorLabels[key]} style={{ background: colors[key] }} />
      ))}
    </div>
  );
}

function InstallGuideCard({
  context,
  installPromptAvailable,
  onInstall,
}: {
  context: InstallContext;
  installPromptAvailable: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="panel install-guide-card">
      <div className="panel-head compact">
        <h2>설치</h2>
      </div>
      <div className="install-guide-status">
        <Smartphone size={20} aria-hidden="true" />
        <div>
          <strong>{context.title}</strong>
          <p>{context.description}</p>
        </div>
      </div>
      <ol>
        {context.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {installPromptAvailable ? (
        <button className="primary-button" onClick={onInstall}>
          <Download size={18} aria-hidden="true" />앱 설치
        </button>
      ) : null}
    </div>
  );
}

function ContextPane({ cat, selectedDate, records }: { cat: CatProfile; selectedDate: string; records: DailyRecord[] }) {
  const todayRecord = records.find((record) => record.date === selectedDate);
  const recent = records.slice(0, 5);
  const alerts = todayRecord ? getAttentionItems(todayRecord) : [];

  return (
    <aside className="context-pane">
      <div className="pet-card">
        <CatAvatar cat={cat} size="large" />
        <div>
          <p className="eyebrow">선택됨</p>
          <h2>{cat.name}</h2>
          <span>
            {cat.ageYears ?? "-"}세 · {formatSex(cat.sex)}
          </span>
        </div>
      </div>

      <div className="panel compact-panel">
        <div className="panel-head compact">
          <h3>{selectedDate.slice(5)} 상태</h3>
        </div>
        {todayRecord ? (
          <div className="status-list">
            <StatusLine label="기본 입력" value={`${filledCoreCount(todayRecord.items)}/${coreRecordFieldOrder.length}`} />
            <StatusLine label="특이점" value={alerts.length ? `${alerts.length}개` : "없음"} tone={alerts.length ? "warning" : "calm"} />
            <StatusLine label="체중" value={todayRecord.items.weightKg ? `${todayRecord.items.weightKg}kg` : "-"} />
            <StatusLine label="메모" value={todayRecord.items.note ? "있음" : "-"} />
            <StatusLine label="사진" value={todayRecord.items.photos?.length ? `${todayRecord.items.photos.length}장` : "-"} />
            {todayRecord.items.note ? <p className="context-note">{todayRecord.items.note}</p> : null}
            {todayRecord.items.photos?.length ? <ImageGrid images={todayRecord.items.photos} /> : null}
          </div>
        ) : (
          <EmptyLine text="이 날짜의 기록이 없어요." />
        )}
      </div>

      <div className="panel compact-panel">
        <div className="panel-head compact">
          <h3>최근 기록</h3>
        </div>
        <div className="mini-list">
          {recent.map((record) => (
            <button className="mini-record" key={record.id}>
              <span>{record.date.slice(5)}</span>
              <strong>{getAttentionItems(record).length ? "주의" : "기록"}</strong>
            </button>
          ))}
          {!recent.length ? <EmptyLine text="최근 기록이 없어요." /> : null}
        </div>
      </div>
    </aside>
  );
}

function DailyOverview({
  cats,
  records,
  selectedDate,
  selectedCatId,
  onSelectCat,
}: {
  cats: CatProfile[];
  records: DailyRecord[];
  selectedDate: string;
  selectedCatId: string;
  onSelectCat: (catId: string) => void;
}) {
  return (
    <div className="daily-overview">
      {cats.map((cat) => {
        const record = findRecord(records, cat.id, selectedDate);
        const alerts = record ? getAttentionItems(record) : [];
        const coreCount = record ? filledCoreCount(record.items) : 0;

        return (
          <button
            className={`overview-card ${selectedCatId === cat.id ? "is-active" : ""} ${!record ? "is-empty" : ""}`}
            key={cat.id}
            onClick={() => onSelectCat(cat.id)}
          >
            <CatAvatar cat={cat} size="large" />
            <span>
              <strong>{cat.name}</strong>
              <small>
                {!record
                  ? "오늘 기록 필요"
                  : alerts.length
                    ? `주의 ${alerts.length}개`
                    : `기본 ${coreCount}/${coreRecordFieldOrder.length}`}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CatAvatar({ cat, size }: { cat: Pick<CatProfile, "name" | "avatarImage">; size: "chip" | "large" }) {
  return (
    <span className={`cat-avatar ${size}`} aria-hidden="true">
      {cat.avatarImage ? <img src={cat.avatarImage.dataUrl} alt="" /> : <Cat size={size === "large" ? 32 : 15} />}
    </span>
  );
}

function ImageGrid({ images, onRemove }: { images: ImageAsset[]; onRemove?: (imageId: string) => void }) {
  return (
    <div className="image-grid">
      {images.map((image) => (
        <figure className="image-thumb" key={image.id}>
          <img src={image.dataUrl} alt={image.name} />
          {onRemove ? (
            <button type="button" onClick={() => onRemove(image.id)} aria-label={`${image.name} 제거`}>
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function CatForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: CatProfile;
  submitLabel: string;
  onSubmit: (cat: Omit<CatProfile, "id">) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ageYears, setAgeYears] = useState(initial?.ageYears?.toString() ?? "");
  const [sex, setSex] = useState<CatSex>(initial?.sex ?? "unknown");
  const [neutered, setNeutered] = useState(initial?.neutered ?? true);
  const [avatarImage, setAvatarImage] = useState<ImageAsset | undefined>(initial?.avatarImage);
  const [imageError, setImageError] = useState("");

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImageError("");
      setAvatarImage(await readImageAsset(file, { maxEdge: 420, quality: 0.82 }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "대표 이미지를 읽을 수 없어요.");
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      ageYears: ageYears === "" ? undefined : Number(ageYears),
      sex,
      neutered,
      avatarImage,
    });
    if (!initial) {
      setName("");
      setAgeYears("");
      setSex("unknown");
      setNeutered(true);
      setAvatarImage(undefined);
      setImageError("");
    }
  };

  return (
    <div className="cat-form">
      <div className="avatar-picker">
        <CatAvatar
          cat={{
            name: name || "preview",
            avatarImage,
          }}
          size="large"
        />
        <div className="avatar-actions">
          <label className="soft-button file-button">
            <Camera size={18} aria-hidden="true" />
            대표 이미지
            <input type="file" accept="image/*" onChange={changeAvatar} />
          </label>
          {avatarImage ? (
            <button className="micro-button" onClick={() => setAvatarImage(undefined)} type="button">
              제거
            </button>
          ) : null}
        </div>
        {imageError ? <p className="form-error">{imageError}</p> : null}
      </div>
      <label>
        이름
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 루나" />
      </label>
      <label>
        나이
        <input
          value={ageYears}
          onChange={(event) => setAgeYears(event.target.value)}
          inputMode="decimal"
          type="number"
          min="0"
          step="0.1"
          placeholder="세"
        />
      </label>
      <div className="form-group">
        <span>성별</span>
        <Segmented
          value={sex}
          options={[
            { value: "female" as const, label: "암컷" },
            { value: "male" as const, label: "수컷" },
            { value: "unknown" as const, label: "모름" },
          ]}
          onChange={setSex}
        />
      </div>
      <div className="form-group">
        <span>중성화</span>
        <Segmented
          value={neutered}
          options={[
            { value: true, label: "예" },
            { value: false, label: "아니오" },
          ]}
          onChange={setNeutered}
        />
      </div>
      <div className="form-actions">
        {onCancel ? (
          <button className="soft-button" onClick={onCancel}>
            취소
          </button>
        ) : null}
        <button className="primary-button" onClick={submit} disabled={!name.trim()}>
          <Plus size={18} aria-hidden="true" />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

function FieldBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="field-block">
      <div className="field-title">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

type SetRecordItem = <K extends keyof RecordItems>(key: K, value: RecordItems[K] | undefined) => void;

function MobileStepInput({ items, onSetItem }: { items: RecordItems; onSetItem: SetRecordItem }) {
  const [step, setStep] = useState(0);
  const field = coreRecordFieldOrder[step];
  const value = items[field];

  const setAndAdvance: SetRecordItem = (key, nextValue) => {
    onSetItem(key, nextValue);
    if (step < coreRecordFieldOrder.length - 1) {
      window.setTimeout(() => setStep((current) => Math.min(current + 1, coreRecordFieldOrder.length - 1)), 120);
    }
  };

  return (
    <div className="mobile-step-input">
      <div className="step-head">
        <div>
          <span>
            {step + 1}/{coreRecordFieldOrder.length}
          </span>
          <strong>{recordFieldLabels[field]}</strong>
        </div>
        <small>{value === undefined ? "미입력" : "입력됨"}</small>
      </div>
      <RecordInputField field={field} items={items} onSetItem={setAndAdvance} />
      <div className="step-actions">
        <button className="soft-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          이전
        </button>
        <button
          className="soft-button"
          onClick={() => setStep((current) => Math.min(coreRecordFieldOrder.length - 1, current + 1))}
          disabled={step === coreRecordFieldOrder.length - 1}
        >
          다음
        </button>
      </div>
    </div>
  );
}

function RecordInputField({
  field,
  items,
  onSetItem,
}: {
  field: RecordField;
  items: RecordItems;
  onSetItem: SetRecordItem;
}) {
  if (field === "appetite") {
    return (
      <FieldBlock icon={<Utensils size={19} />} title="식욕">
        <Segmented value={items.appetite} options={relativeOptions} onChange={(value) => onSetItem("appetite", value)} />
      </FieldBlock>
    );
  }

  if (field === "waterIntake") {
    return (
      <FieldBlock icon={<Droplets size={19} />} title="물 섭취">
        <Segmented value={items.waterIntake} options={relativeOptions} onChange={(value) => onSetItem("waterIntake", value)} />
      </FieldBlock>
    );
  }

  if (field === "stoolCount") {
    return (
      <FieldBlock icon={<PawPrint size={19} />} title="배변">
        <Segmented value={items.stoolCount} options={countOptions} onChange={(value) => onSetItem("stoolCount", value)} />
      </FieldBlock>
    );
  }

  if (field === "urineCount") {
    return (
      <FieldBlock icon={<Droplets size={19} />} title="소변">
        <Segmented value={items.urineCount} options={countOptions} onChange={(value) => onSetItem("urineCount", value)} />
      </FieldBlock>
    );
  }

  if (field === "activity") {
    return (
      <FieldBlock icon={<Activity size={19} />} title="활동량">
        <Segmented value={items.activity} options={relativeOptions} onChange={(value) => onSetItem("activity", value)} />
      </FieldBlock>
    );
  }

  if (field === "foodSnackAmount") {
    return (
      <FieldBlock icon={<Utensils size={19} />} title="사료/간식">
        <Segmented
          value={items.foodSnackAmount}
          options={relativeOptions}
          onChange={(value) => onSetItem("foodSnackAmount", value)}
        />
      </FieldBlock>
    );
  }

  if (field === "condition") {
    return (
      <FieldBlock icon={<HeartPulse size={19} />} title="컨디션">
        <Segmented value={items.condition} options={conditionOptions} onChange={(value) => onSetItem("condition", value)} />
      </FieldBlock>
    );
  }

  if (field === "vomit") {
    return (
      <FieldBlock icon={<CircleAlert size={19} />} title="구토">
        <Segmented
          value={items.vomit}
          options={[
            { value: false, label: "없음" },
            { value: true, label: "있음" },
          ]}
          onChange={(value) => onSetItem("vomit", value)}
        />
      </FieldBlock>
    );
  }

  if (field === "weightKg") {
    return (
      <FieldBlock icon={<Weight size={19} />} title="체중">
        <div className="weight-input-wrap">
          <input
            className="weight-input"
            inputMode="decimal"
            min="0"
            max="30"
            step="0.01"
            type="number"
            placeholder="kg"
            value={items.weightKg ?? ""}
            onChange={(event) => onSetItem("weightKg", event.target.value === "" ? undefined : Number(event.target.value))}
            aria-label="체중"
          />
          <button className="micro-button" onClick={() => onSetItem("weightKg", undefined)}>
            비움
          </button>
        </div>
      </FieldBlock>
    );
  }

  return (
    <FieldBlock icon={<Pill size={19} />} title="약 복용">
      <Segmented
        value={items.medicationTaken}
        options={[
          { value: false, label: "안 먹음" },
          { value: true, label: "먹음" },
        ]}
        onChange={(value) => onSetItem("medicationTaken", value)}
      />
    </FieldBlock>
  );
}

function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
}: {
  value: T | undefined;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" style={{ "--segments": options.length } as CSSProperties}>
      {options.map((option) => (
        <button
          className={Object.is(value, option.value) ? "is-active" : ""}
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "calm" }) {
  return (
    <div className={`kpi ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function WeightChart({ records }: { records: DailyRecord[] }) {
  const points = records.filter((record) => record.items.weightKg !== undefined);

  if (!points.length) return <EmptyLine text="체중 기록이 아직 없어요." />;

  const values = points.map((record) => record.items.weightKg as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.2);
  const width = 720;
  const height = 220;
  const padding = 24;
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const pathPoints = points
    .map((record, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (((record.items.weightKg as number) - min) / spread) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="체중 변화 그래프">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
        <line x1={padding} x2={padding} y1={padding} y2={height - padding} />
        <polyline points={pathPoints} />
        {points.map((record, index) => {
          const x = padding + index * xStep;
          const y = height - padding - (((record.items.weightKg as number) - min) / spread) * (height - padding * 2);
          return <circle key={record.id} cx={x} cy={y} r="5" />;
        })}
      </svg>
      <div className="chart-labels">
        <span>{points[0]?.date.slice(5)}</span>
        <strong>
          {min.toFixed(1)}kg - {max.toFixed(1)}kg
        </strong>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function TimelineItem({ record }: { record: DailyRecord }) {
  const alerts = getAttentionItems(record);

  return (
    <article className={`timeline-item ${alerts.length ? "has-alert" : ""}`}>
      <div>
        <time>{record.date.slice(5)}</time>
        <strong>{alerts.length ? alerts.join(", ") : "특이점 없음"}</strong>
      </div>
      <div className="timeline-tags">
        {record.items.appetite ? <span>식욕 {formatRelative(record.items.appetite)}</span> : null}
        {record.items.waterIntake ? <span>물 {formatRelative(record.items.waterIntake)}</span> : null}
        {record.items.weightKg ? <span>{record.items.weightKg}kg</span> : null}
        {record.items.condition ? <span>{formatCondition(record.items.condition)}</span> : null}
        {record.items.note ? <span>메모</span> : null}
        {record.items.photos?.length ? <span>사진 {record.items.photos.length}</span> : null}
      </div>
      {record.items.note ? <p className="timeline-note">{record.items.note}</p> : null}
      {record.items.photos?.length ? <ImageGrid images={record.items.photos.slice(0, 3)} /> : null}
    </article>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "danger" | "calm";
}) {
  return (
    <div className={`status-line ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="empty-line">{text}</p>;
}

function Toast({ toast }: { toast: NonNullable<ToastState> }) {
  return (
    <div className={`toast ${toast.tone}`}>
      {toast.tone === "success" ? <Check size={18} /> : <CircleAlert size={18} />}
      {toast.message}
    </div>
  );
}

function getAttentionItems(record: DailyRecord) {
  const alerts: string[] = [];
  const { items } = record;

  if (items.vomit) alerts.push("구토");
  if (items.appetite === "decreased") alerts.push("식욕 감소");
  if (items.waterIntake === "increased") alerts.push("음수 증가");
  if (items.waterIntake === "decreased") alerts.push("음수 감소");
  if (items.stoolCount === 0) alerts.push("배변 없음");
  if (items.stoolCount === 4) alerts.push("배변 4+");
  if (items.urineCount === 0) alerts.push("소변 없음");
  if (items.urineCount === 4) alerts.push("소변 4+");
  if (items.activity === "decreased") alerts.push("활동 감소");
  if (items.foodSnackAmount === "decreased") alerts.push("사료/간식 감소");
  if (items.condition === "bad") alerts.push("컨디션 나쁨");

  return alerts;
}

function countAttentionItems(records: DailyRecord[]) {
  const counts: Record<string, number> = {};

  for (const record of records) {
    for (const item of getAttentionItems(record)) {
      counts[item] = (counts[item] ?? 0) + 1;
    }
  }

  return counts;
}

function buildVetReportText(cat: CatProfile, records: DailyRecord[], fromDate: string, toDate: string) {
  const attentionCounts = countAttentionItems(records);
  const latestWeight = [...records].reverse().find((record) => record.items.weightKg !== undefined)?.items.weightKg;
  const noteRecords = records.filter((record) => record.items.note || record.items.photos?.length);
  const lines = [
    `MyLoveCat 수의사 공유 리포트`,
    `고양이: ${cat.name}`,
    `프로필: ${cat.ageYears ?? "-"}세 / ${formatSex(cat.sex)} / ${cat.neutered ? "중성화" : "미중성화"}`,
    `기간: ${fromDate} - ${toDate}`,
    `기록일: ${records.length}일`,
    `최근 체중: ${latestWeight ? `${latestWeight}kg` : "-"}`,
    "",
    "주의 항목:",
    Object.keys(attentionCounts).length
      ? Object.entries(attentionCounts)
          .map(([label, count]) => `- ${label}: ${count}`)
          .join("\n")
      : "- 없음",
    "",
    "일자별 기록:",
    ...records.map((record) => {
      const items = record.items;
      return [
        `${record.date}`,
        `식욕 ${formatRelative(items.appetite)}`,
        `물 ${formatRelative(items.waterIntake)}`,
        `배변 ${formatCount(items.stoolCount)}`,
        `소변 ${formatCount(items.urineCount)}`,
        `구토 ${items.vomit === undefined ? "-" : items.vomit ? "있음" : "없음"}`,
        `활동 ${formatRelative(items.activity)}`,
        `컨디션 ${formatCondition(items.condition)}`,
        `체중 ${items.weightKg ? `${items.weightKg}kg` : "-"}`,
        `주의 ${getAttentionItems(record).join(", ") || "-"}`,
        items.note ? `메모 ${items.note}` : undefined,
        items.photos?.length ? `사진 ${items.photos.length}장` : undefined,
      ]
        .filter(Boolean)
        .join(" / ");
    }),
    "",
    `메모/사진 기록일: ${noteRecords.length}일`,
  ];

  return lines.join("\n");
}

function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  return monthKey(formatDate(date));
}

function formatKoreanDate(dateString: string) {
  return parseDate(dateString).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatRelative(value?: RelativeValue) {
  if (value === "decreased") return "감소";
  if (value === "same") return "비슷";
  if (value === "increased") return "증가";
  return "-";
}

function formatCondition(value?: ConditionValue) {
  if (value === "bad") return "나쁨";
  if (value === "normal") return "보통";
  if (value === "good") return "좋음";
  return "-";
}

function formatCount(value?: number) {
  if (value === undefined) return "-";
  return value === 4 ? "4+" : String(value);
}

function formatSex(value: CatSex) {
  if (value === "female") return "암컷";
  if (value === "male") return "수컷";
  return "모름";
}

function formatBytes(value: number) {
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

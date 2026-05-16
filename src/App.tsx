import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  Cat,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Droplets,
  HeartPulse,
  LineChart,
  PawPrint,
  Pill,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  Upload,
  Utensils,
  Weight,
} from "lucide-react";
import type {
  AppData,
  CatProfile,
  CatSex,
  ConditionValue,
  DailyRecord,
  MonthlyExport,
  RecordField,
  RecordItems,
  RelativeValue,
} from "./types";
import { recordFieldLabels, recordFieldOrder } from "./types";
import {
  addDays,
  buildMonthlyExport,
  compactItems,
  deleteCat,
  downloadJson,
  filledCount,
  findRecord,
  formatDate,
  loadData,
  makeId,
  mergeMonthlyExport,
  missingFields,
  monthKey,
  monthStartWeekday,
  parseDate,
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

function initialTab(): TabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tabs.some((item) => item.id === tab) ? (tab as TabId) : "today";
}

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [selectedCatId, setSelectedCatId] = useState(() => data.cats[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [calendarMonth, setCalendarMonth] = useState(() => monthKey(todayString()));
  const [activeTab, setActiveTab] = useState<TabId>(() => initialTab());
  const [toast, setToast] = useState<ToastState>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => saveData(data), [data]);

  useEffect(() => {
    if (!selectedCatId && data.cats[0]) setSelectedCatId(data.cats[0].id);
    if (selectedCatId && !data.cats.some((cat) => cat.id === selectedCatId)) {
      setSelectedCatId(data.cats[0]?.id ?? "");
    }
  }, [data.cats, selectedCatId]);

  useEffect(() => setCalendarMonth(monthKey(selectedDate)), [selectedDate]);

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
              icon: "/icon.svg",
              badge: "/favicon.svg",
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

        {data.cats.length === 0 ? (
          <SetupView onAddCat={addCat} />
        ) : selectedCat ? (
          <>
            {activeTab === "today" && (
              <TodayView
                cat={selectedCat}
                data={data}
                selectedDate={selectedDate}
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
            {activeTab === "track" && <TrackView cat={selectedCat} records={selectedRecords} selectedDate={selectedDate} />}
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
            <PawPrint size={16} aria-hidden="true" />
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

function TodayView({
  cat,
  data,
  selectedDate,
  onSaveData,
  onToast,
}: {
  cat: CatProfile;
  data: AppData;
  selectedDate: string;
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
  const missing = missingFields(compacted);
  const completion = Math.round((filledCount(compacted) / recordFieldOrder.length) * 100);
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

    const missingNames = missingFields(items).map((field) => recordFieldLabels[field]);
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

  return (
    <section className="today-layout">
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

        <div className="field-grid">
          <FieldBlock icon={<Utensils size={19} />} title="식욕">
            <Segmented value={draft.appetite} options={relativeOptions} onChange={(value) => setItem("appetite", value)} />
          </FieldBlock>
          <FieldBlock icon={<Droplets size={19} />} title="물 섭취">
            <Segmented
              value={draft.waterIntake}
              options={relativeOptions}
              onChange={(value) => setItem("waterIntake", value)}
            />
          </FieldBlock>
          <FieldBlock icon={<PawPrint size={19} />} title="배변">
            <Segmented value={draft.stoolCount} options={countOptions} onChange={(value) => setItem("stoolCount", value)} />
          </FieldBlock>
          <FieldBlock icon={<Droplets size={19} />} title="소변">
            <Segmented value={draft.urineCount} options={countOptions} onChange={(value) => setItem("urineCount", value)} />
          </FieldBlock>
          <FieldBlock icon={<CircleAlert size={19} />} title="구토">
            <Segmented
              value={draft.vomit}
              options={[
                { value: false, label: "없음" },
                { value: true, label: "있음" },
              ]}
              onChange={(value) => setItem("vomit", value)}
            />
          </FieldBlock>
          <FieldBlock icon={<Activity size={19} />} title="활동량">
            <Segmented value={draft.activity} options={relativeOptions} onChange={(value) => setItem("activity", value)} />
          </FieldBlock>
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
                value={draft.weightKg ?? ""}
                onChange={(event) =>
                  setItem("weightKg", event.target.value === "" ? undefined : Number(event.target.value))
                }
                aria-label="체중"
              />
              <button className="micro-button" onClick={() => setItem("weightKg", undefined)}>
                비움
              </button>
            </div>
          </FieldBlock>
          <FieldBlock icon={<Pill size={19} />} title="약 복용">
            <Segmented
              value={draft.medicationTaken}
              options={[
                { value: false, label: "안 먹음" },
                { value: true, label: "먹음" },
              ]}
              onChange={(value) => setItem("medicationTaken", value)}
            />
          </FieldBlock>
          <FieldBlock icon={<Utensils size={19} />} title="사료/간식">
            <Segmented
              value={draft.foodSnackAmount}
              options={relativeOptions}
              onChange={(value) => setItem("foodSnackAmount", value)}
            />
          </FieldBlock>
          <FieldBlock icon={<HeartPulse size={19} />} title="컨디션">
            <Segmented value={draft.condition} options={conditionOptions} onChange={(value) => setItem("condition", value)} />
          </FieldBlock>
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
          const complete = record ? filledCount(record.items) : 0;

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
                  {alerts.length ? `주의 ${alerts.length}` : `${complete}/${recordFieldOrder.length}`}
                </small>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TrackView({ cat, records, selectedDate }: { cat: CatProfile; records: DailyRecord[]; selectedDate: string }) {
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  onInstall: () => void;
}) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const editingCat = data.cats.find((cat) => cat.id === editingCatId);
  const exportMonth = monthKey(selectedDate);

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
          <h2>데이터</h2>
        </div>
        <div className="button-stack">
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

function ContextPane({ cat, selectedDate, records }: { cat: CatProfile; selectedDate: string; records: DailyRecord[] }) {
  const todayRecord = records.find((record) => record.date === selectedDate);
  const recent = records.slice(0, 5);
  const alerts = todayRecord ? getAttentionItems(todayRecord) : [];

  return (
    <aside className="context-pane">
      <div className="pet-card">
        <div className="pet-avatar">
          <Cat size={32} aria-hidden="true" />
        </div>
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
            <StatusLine label="입력" value={`${filledCount(todayRecord.items)}/${recordFieldOrder.length}`} />
            <StatusLine label="특이점" value={alerts.length ? `${alerts.length}개` : "없음"} tone={alerts.length ? "warning" : "calm"} />
            <StatusLine label="체중" value={todayRecord.items.weightKg ? `${todayRecord.items.weightKg}kg` : "-"} />
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

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      ageYears: ageYears === "" ? undefined : Number(ageYears),
      sex,
      neutered,
    });
    if (!initial) {
      setName("");
      setAgeYears("");
      setSex("unknown");
      setNeutered(true);
    }
  };

  return (
    <div className="cat-form">
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
      </div>
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

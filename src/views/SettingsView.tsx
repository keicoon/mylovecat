import React, { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Bell, Download, Palette, Settings, Trash2, Upload } from "lucide-react";
import type { AppData, CatProfile, MonthlyExport, ThemeMode } from "../types";
import {
  buildMonthlyExport,
  downloadJson,
  estimateStorageUsage,
  mergeMonthlyExport,
  monthKey,
} from "../storage";
import { formatBytes, formatSex } from "../logic";
import { t } from "../i18n";
import { Segmented } from "../components/Segmented";
import { CatForm } from "../components/CatForm";
import { InstallGuideCard, InstallContext } from "../components/InstallBanner";
import { buildThemeTemplate, normalizeCustomTheme } from "../theme";
import { syncService, SyncStatus } from "../syncService";

type ToastState = { tone: "success" | "warning" | "danger"; message: string } | null;

export function SettingsView({
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
  syncStatus,
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
  syncStatus: SyncStatus;
}) {
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [storageText, setStorageText] = useState(t("common.loading"));
  const editingCat = data.cats.find((cat) => cat.id === editingCatId);
  const exportMonth = monthKey(selectedDate);

  const handleSync = async () => {
    if (!syncStatus.signedIn) {
      await syncService.signIn();
      return;
    }

    onToast({ tone: "warning", message: "구글 드라이브와 동기화 중..." });
    const merged = await syncService.sync(data);
    if (merged) {
      onDataChange(() => merged);
      onToast({ tone: "success", message: "동기화를 완료했어요." });
    } else {
      onToast({ tone: "danger", message: "동기화에 실패했어요." });
    }
  };

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
      onToast({ tone: "danger", message: "가져오기에 실패했어요." });
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
      onToast({ tone: "danger", message: "테마 가져오기에 실패했어요." });
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
          {data.cats.length === 0 && <p className="helper-text">등록된 고양이가 없어요.</p>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>알림 설정</h2>
        </div>
        <div className="setting-line">
          <label htmlFor="reminder">매일 기록 알림 시간</label>
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
        <div className="setting-line">
          <label htmlFor="weekly-report">주간 리포트 자동 저장</label>
          <input
            id="weekly-report"
            type="checkbox"
            checked={data.settings.weeklyReportEnabled}
            onChange={(event) =>
              onDataChange((current) => ({
                ...current,
                settings: { ...current.settings, weeklyReportEnabled: event.target.checked },
              }))
            }
          />
        </div>
        <button className="soft-button" style={{ marginTop: "12px" }} onClick={requestNotification}>
          <Bell size={18} aria-hidden="true" />
          브라우저 알림 권한 허용
        </button>
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>{t("settings.theme.title")}</h2>
        </div>
        <div className="theme-control">
          <Segmented
            value={data.settings.theme}
            options={[
              { value: "system" as const, label: t("settings.theme.system") },
              { value: "light" as const, label: t("settings.theme.light") },
              { value: "dark" as const, label: t("settings.theme.dark") },
              { value: "calico" as const, label: t("settings.theme.calico") },
              { value: "custom" as const, label: t("settings.theme.custom") },
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
          <div className="button-stack" style={{ marginTop: "16px" }}>
            <label className="soft-button file-button">
              <Palette size={18} aria-hidden="true" />
              커스텀 테마 가져오기
              <input type="file" accept="application/json" onChange={handleThemeImport} />
            </label>
            <button className="soft-button" onClick={handleThemeExport}>
              <Download size={18} aria-hidden="true" />
              현재 테마 내보내기
            </button>
          </div>
        </div>
      </div>

      <InstallGuideCard context={installContext} installPromptAvailable={installPromptAvailable} onInstall={onInstall} />

      <div className="panel">
        <div className="panel-head compact">
          <h2>{t("settings.sync.title")}</h2>
        </div>
        <p className="helper-text" style={{ marginBottom: "12px" }}>
          {t("settings.sync.description")}
        </p>
        <div className="button-stack">
          <button className={`soft-button ${syncStatus.signedIn ? "is-active" : ""}`} onClick={handleSync} disabled={syncStatus.isSyncing}>
            <Upload size={18} aria-hidden="true" />
            {syncStatus.signedIn ? (syncStatus.isSyncing ? t("common.loading") : t("settings.sync.syncNow")) : t("settings.sync.login")}
          </button>
          {syncStatus.signedIn && (
            <button className="micro-button" onClick={() => syncService.signOut()}>
              {t("settings.sync.logout")}
            </button>
          )}
        </div>
        {syncStatus.error && (
          <p className="form-error" style={{ marginTop: "12px", color: "var(--coral)" }}>
            {syncStatus.error}
          </p>
        )}
        {syncStatus.lastSyncedAt && (
          <p className="helper-text" style={{ marginTop: "8px" }}>
            {t("settings.sync.lastSynced")}: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="panel">
        <div className="panel-head compact">
          <h2>데이터 관리</h2>
        </div>
        <div className="storage-meter">
          <span>기기 내부 저장소</span>
          <strong>{storageText}</strong>
        </div>
        <div className="button-stack">
          <button className="soft-button" onClick={handleExport}>
            <Download size={18} aria-hidden="true" />
            {exportMonth} 백업 JSON 내보내기
          </button>
          <label className="soft-button file-button">
            <Upload size={18} aria-hidden="true" />
            백업 JSON 가져오기
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
        </div>
      </div>
    </section>
  );
}

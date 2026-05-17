import React, { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Bell, Download, Monitor, Moon, Palette, Settings, ShieldCheck, Sparkles, Sun, Trash2, Upload } from "lucide-react";
import type { AppData, CatProfile, CustomTheme, MonthlyExport, ThemeMode } from "../types";
import { themeColorKeys, themeColorLabels } from "../theme";
import {
  buildMonthlyExport,
  downloadJson,
  estimateStorageUsage,
  mergeMonthlyExport,
  monthKey,
  requestPersistentStorage,
} from "../storage";
import { formatBytes, formatSex } from "../logic";
import { Segmented } from "../components/Segmented";
import { CatForm } from "../components/CatForm";
import { InstallGuideCard, InstallContext } from "../components/InstallBanner";
import { buildThemeTemplate, normalizeCustomTheme } from "../theme";

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

          <div className="theme-guide">
            <h3>커스텀 테마 가이드</h3>
            <p>
              JSON 파일을 편집하여 나만의 테마를 만들 수 있습니다. 아래 포맷의 파일을 작성하여
              '테마 가져오기'로 적용해 보세요.
            </p>
            <code className="theme-code">
              {`{
  "schemaVersion": 1,
  "app": "mylovecat-theme",
  "name": "나의 테마 이름",
  "colors": {
    "base": "#f8fbfb",
    "surface": "#ffffff",
    "brand": "#283d3a",
    "green": "#168f83",
    "coral": "#ff6f91"
  }
}`}
            </code>
            <p>
              현재 적용된 테마를 '내보내기' 하여 원본 파일을 확인하고 수정하는 방식을 권장합니다.
            </p>
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

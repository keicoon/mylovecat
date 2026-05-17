import React from "react";
import { Cloud, Download, Flame, Plus } from "lucide-react";
import type { CatProfile, DailyRecord } from "../types";
import { CatAvatar } from "../components/CatAvatar";
import { SyncStatus } from "../syncService";
import { calculateStreak } from "../logic";

export function TopBar({
  cats,
  records,
  selectedCatId,
  selectedDate,
  onSelectCat,
  onDateChange,
  onAddCat,
  installPromptAvailable,
  onInstall,
  syncStatus,
}: {
  cats: CatProfile[];
  records: DailyRecord[];
  selectedCatId: string;
  selectedDate: string;
  onSelectCat: (catId: string) => void;
  onDateChange: (date: string) => void;
  onAddCat: () => void;
  installPromptAvailable: boolean;
  onInstall: () => void;
  syncStatus: SyncStatus;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">MyLoveCat</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h1>오늘의 고양이 기록</h1>
          {syncStatus.signedIn ? (
            <div className={`sync-indicator ${syncStatus.isSyncing ? "is-syncing" : ""}`} title="클라우드 동기화 중">
              <Cloud size={14} color={syncStatus.error ? "var(--coral)" : "var(--mint)"} />
            </div>
          ) : null}
        </div>
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
        {cats.map((cat) => {
          const streak = calculateStreak(records, cat.id);
          return (
            <button
              className={`cat-chip ${selectedCatId === cat.id ? "is-active" : ""}`}
              key={cat.id}
              onClick={() => onSelectCat(cat.id)}
            >
              <CatAvatar cat={cat} size="chip" />
              {cat.name}
              {streak > 0 && (
                <span className="streak-badge" title={`${streak}일 연속 기록 중`}>
                  <Flame size={12} fill="currentColor" />
                  {streak}
                </span>
              )}
            </button>
          );
        })}
        <button className="cat-chip add" onClick={onAddCat}>
          <Plus size={16} aria-hidden="true" />
          추가
        </button>
      </div>
    </header>
  );
}

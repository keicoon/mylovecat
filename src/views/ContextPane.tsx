import React from "react";
import type { CatProfile, DailyRecord } from "../types";
import { coreRecordFieldOrder } from "../types";
import { filledCoreCount } from "../storage";
import { getAttentionItems, formatSex } from "../logic";
import { CatAvatar } from "../components/CatAvatar";
import { StatusLine, EmptyLine } from "../components/CommonUI";
import { ImageGrid } from "../components/CatForm";

export function ContextPane({ cat, selectedDate, records }: { cat: CatProfile; selectedDate: string; records: DailyRecord[] }) {
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

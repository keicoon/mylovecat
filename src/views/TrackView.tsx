import React, { useState } from "react";
import { Copy, Printer, Share2, Sparkles } from "lucide-react";
import type { CatProfile, DailyRecord } from "../types";
import { addDays } from "../storage";
import {
  getAttentionItems,
  countAttentionItems,
  formatRelative,
  formatCount,
  formatCondition,
  formatSex,
  buildVetReportText,
  getWeeklyHealthSummary,
} from "../logic";
import { Kpi, EmptyLine } from "../components/CommonUI";
import { Segmented } from "../components/Segmented";
import { AdUnit } from "../components/AdUnit";
import { CatAvatar } from "../components/CatAvatar";
import { ImageGrid } from "../components/CatForm";

type ToastState = { tone: "success" | "warning" | "danger"; message: string } | null;

export function TrackView({
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
  const healthSummary = getWeeklyHealthSummary(visible);

  return (
    <section className="track-grid">
      <div className="panel span-2 health-summary-panel">
        <div className="panel-head compact">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="var(--amber)" />
            <h3 style={{ margin: 0 }}>건강 리포트 요약</h3>
          </div>
        </div>
        <p className="summary-text" style={{ padding: "0 16px 16px", color: "var(--muted)", lineHeight: 1.6 }}>
          {healthSummary}
        </p>
      </div>

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
            onChange={(val) => setRange(val as any)}
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

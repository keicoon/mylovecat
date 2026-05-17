import React, { useMemo } from "react";
import { Activity, Droplets, HeartPulse, Sparkles, Utensils } from "lucide-react";
import type { CatProfile, DailyRecord } from "../types";
import { getAttentionItems, formatRelative, formatCondition } from "../logic";
import { Kpi, EmptyLine } from "../components/CommonUI";
import { t } from "../i18n";

export function DashboardView({
  cat,
  records,
}: {
  cat: CatProfile;
  records: DailyRecord[];
}) {
  const last7Days = useMemo(() => records.slice(0, 7).reverse(), [records]);
  
  const metrics = useMemo(() => {
    if (last7Days.length === 0) return null;
    
    const appetiteScore = last7Days.filter(r => r.items.appetite === 'increased' || r.items.appetite === 'same').length;
    const waterScore = last7Days.filter(r => r.items.waterIntake === 'same').length;
    const conditionScore = last7Days.filter(r => r.items.condition === 'good' || r.items.condition === 'normal').length;
    const vomitDays = last7Days.filter(r => r.items.vomit).length;

    return {
      appetite: (appetiteScore / last7Days.length) * 100,
      water: (waterScore / last7Days.length) * 100,
      condition: (conditionScore / last7Days.length) * 100,
      vomit: vomitDays
    };
  }, [last7Days]);

  if (records.length === 0) {
    return (
      <div className="panel dashboard-empty">
        <div className="empty-cat-art">🐾</div>
        <h2>분석할 데이터가 부족해요</h2>
        <p>최소 1일 이상의 기록이 쌓이면 고양이의 건강 패턴을 분석해 드릴게요.</p>
      </div>
    );
  }

  return (
    <section className="dashboard-grid">
      <div className="panel span-2 insight-card">
        <div className="panel-head compact">
          <Sparkles size={18} color="var(--amber)" />
          <h3>주간 건강 지수</h3>
        </div>
        <div className="score-row">
          <ScoreItem label="식욕" score={metrics?.appetite ?? 0} icon={<Utensils size={20} />} />
          <ScoreItem label="음수" score={metrics?.water ?? 0} icon={<Droplets size={20} />} />
          <ScoreItem label="컨디션" score={metrics?.condition ?? 0} icon={<HeartPulse size={20} />} />
        </div>
      </div>

      <div className="panel correlation-chart">
        <div className="panel-head compact">
          <h3>식욕 vs 음수 상관관계</h3>
        </div>
        <div className="mini-chart-area">
          {last7Days.map((r, i) => (
            <div key={r.id} className="bar-group">
              <div className="bar appetite" style={{ height: `${(getValScore(r.items.appetite) * 30)}px` }} />
              <div className="bar water" style={{ height: `${(getValScore(r.items.waterIntake) * 30)}px` }} />
              <small>{r.date.slice(8)}</small>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span className="dot appetite">식욕</span>
          <span className="dot water">음수</span>
        </div>
      </div>

      <div className="panel alert-summary">
        <div className="panel-head compact">
          <h3>주의가 필요한 항목</h3>
        </div>
        {metrics?.vomit && metrics.vomit > 0 ? (
          <div className="alert-item danger">
            <Activity size={18} />
            <span>최근 7일 내 구토가 {metrics.vomit}회 발생했습니다.</span>
          </div>
        ) : (
          <div className="alert-item calm">
            <Activity size={18} />
            <span>현재 특별히 위험한 징후는 발견되지 않았습니다.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ScoreItem({ label, score, icon }: { label: string, score: number, icon: React.ReactNode }) {
  const tone = score > 80 ? 'calm' : score > 50 ? 'warning' : 'danger';
  return (
    <div className={`score-item ${tone}`}>
      <div className="score-circle">
        {icon}
        <svg viewBox="0 0 36 36">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--soft-line)" strokeWidth="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${score}, 100`} />
        </svg>
      </div>
      <span>{label}</span>
      <strong>{Math.round(score)}%</strong>
    </div>
  );
}

function getValScore(val: any) {
  if (val === 'increased') return 3;
  if (val === 'same') return 2;
  if (val === 'decreased') return 1;
  return 0;
}

import React from "react";
import { Check, CircleAlert } from "lucide-react";

export function Kpi({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "calm" }) {
  return (
    <div className={`kpi ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusLine({
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

export function EmptyLine({ text }: { text: string }) {
  return <p className="empty-line">{text}</p>;
}

export function LoadingView() {
  return (
    <section className="panel loading-panel">
      <div className="loading-mark" />
      <h2>기록을 불러오는 중</h2>
      <div style={{ display: 'grid', gap: '10px', width: '100%', maxWidth: '400px', marginTop: '20px' }}>
        <div className="skeleton" style={{ height: '60px', width: '100%' }} />
        <div className="skeleton" style={{ height: '120px', width: '100%' }} />
        <div className="skeleton" style={{ height: '60px', width: '100%' }} />
      </div>
    </section>
  );
}

export function Toast({ toast }: { toast: { tone: "success" | "warning" | "danger"; message: string } }) {
  return (
    <div className={`toast ${toast.tone}`}>
      {toast.tone === "success" ? <Check size={18} /> : <CircleAlert size={18} />}
      {toast.message}
    </div>
  );
}

export function FieldBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
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

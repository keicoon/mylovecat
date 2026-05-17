import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CatProfile, DailyRecord } from "../types";
import { coreRecordFieldOrder } from "../types";
import { monthStartWeekday, filledCoreCount, todayString } from "../storage";
import { getAttentionItems, shiftMonth } from "../logic";

export function CalendarView({
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
  const today = todayString();
  
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
          const isToday = cell.date === today;

          return (
            <button
              className={`calendar-cell ${selectedDate === cell.date ? "is-selected" : ""} ${
                record ? "has-record" : ""
              } ${alerts.length ? "has-alert" : ""} ${isToday ? "is-today" : ""}`}
              key={cell.date}
              onClick={() => onDateSelect(cell.date)}
            >
              <span className="date-num">{Number(cell.date.slice(8, 10))}</span>
              {record ? (
                <div className="cell-status">
                  {alerts.length > 0 ? (
                    <span className="alert-dot" />
                  ) : (
                    <span className="check-dot" />
                  )}
                  <small>
                    {alerts.length
                      ? `주의 ${alerts.length}`
                      : record.items.note || record.items.photos?.length
                        ? "특이사항"
                        : `${complete}/${coreRecordFieldOrder.length}`}
                  </small>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

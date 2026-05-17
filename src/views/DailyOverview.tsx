import React from "react";
import type { CatProfile, DailyRecord } from "../types";
import { coreRecordFieldOrder } from "../types";
import { CatAvatar } from "../components/CatAvatar";
import { findRecord, filledCoreCount } from "../storage";
import { getAttentionItems } from "../logic";

export function DailyOverview({
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

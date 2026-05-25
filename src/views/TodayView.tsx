import React, { useEffect, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  Camera,
  Check,
  CircleAlert,
  Image as ImageIcon,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  CatAppetiteIcon,
  CatWaterIcon,
  CatLitterIcon,
  CatActivityIcon,
  CatConditionIcon,
  CatVomitIcon,
  CatWeightIcon,
  CatMedIcon,
} from "../components/CatIcons";
import type { AppData, CatProfile, DailyRecord, RecordField, RecordItems, RelativeValue, ConditionValue } from "../types";
import { recordFieldLabels, coreRecordFieldOrder, advancedRecordFieldOrder } from "../types";
import {
  addDays,
  compactItems,
  filledCoreCount,
  findRecord,
  missingCoreFields,
  readImageAsset,
  upsertRecord,
} from "../storage";
import { getAttentionItems, formatKoreanDate } from "../logic";
import { AdUnit } from "../components/AdUnit";
import { HealthTipCard } from "../components/HealthTipCard";
import { Segmented } from "../components/Segmented";
import { FieldBlock } from "../components/CommonUI";
import { ImageGrid } from "../components/CatForm";

type ToastState = { tone: "success" | "warning" | "danger"; message: string } | null;

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

export function TodayView({
  cat,
  cats,
  data,
  selectedDate,
  selectedCatId,
  onSelectCat,
  onSaveData,
  onToast,
}: {
  cat: CatProfile;
  cats: CatProfile[];
  data: AppData;
  selectedDate: string;
  selectedCatId: string;
  onSelectCat: (catId: string) => void;
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
  const missing = missingCoreFields(compacted);
  const completion = Math.round((filledCoreCount(compacted) / coreRecordFieldOrder.length) * 100);
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

    const missingNames = missingCoreFields(items).map((field) => recordFieldLabels[field]);
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

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    const currentPhotos = draft.photos ?? [];
    const remaining = Math.max(0, 4 - currentPhotos.length);
    if (!remaining) {
      onToast({ tone: "warning", message: "사진은 하루 기록당 4장까지 추가할 수 있어요." });
      return;
    }

    try {
      const assets = await Promise.all(
        files.slice(0, remaining).map((file) => readImageAsset(file, { maxEdge: 900, quality: 0.78 })),
      );
      setItem("photos", [...currentPhotos, ...assets]);
      onToast({ tone: "success", message: `사진 ${assets.length}장을 추가했어요.` });
    } catch (error) {
      onToast({ tone: "danger", message: error instanceof Error ? error.message : "사진 추가에 실패했어요." });
    }
  };

  const removePhoto = (photoId: string) => {
    const nextPhotos = (draft.photos ?? []).filter((photo) => photo.id !== photoId);
    setItem("photos", nextPhotos.length ? nextPhotos : undefined);
  };

  return (
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

      <MobileStepInput draft={draft} onSetItem={setItem} />

      <div className="field-grid desktop-fields">
        {coreRecordFieldOrder.map((field) => (
          <RecordInputField field={field} items={draft} key={field} onSetItem={setItem} />
        ))}
      </div>

      <details className="advanced-panel">
        <summary>
          <span>확장 기록</span>
          <small>구토, 체중, 약 복용</small>
        </summary>
        <div className="field-grid">
          {advancedRecordFieldOrder.map((field) => (
            <RecordInputField field={field} items={draft} key={field} onSetItem={setItem} />
          ))}
        </div>
      </details>

      <div className="detail-panel">
        <div className="detail-head">
          <div>
            <p className="eyebrow">Special note</p>
            <h3>특이사항</h3>
          </div>
          <label className="soft-button file-button">
            <Camera size={18} aria-hidden="true" />
            사진 추가
            <input type="file" accept="image/*" multiple onChange={addPhotos} />
          </label>
        </div>
        <textarea
          className="note-input"
          maxLength={500}
          placeholder="예: 아침에 구토 1회, 식욕이 평소보다 떨어짐"
          value={draft.note ?? ""}
          onChange={(event) => setItem("note", event.target.value || undefined)}
        />
        {draft.photos?.length ? (
          <ImageGrid images={draft.photos} onRemove={removePhoto} />
        ) : (
          <p className="helper-text">
            <ImageIcon size={16} aria-hidden="true" />
            사진은 최대 4장까지 저장됩니다.
          </p>
        )}
      </div>

      <div className="record-footer">
        <p>{missing.length ? `미입력 ${missing.length}개가 있어요.` : "모든 항목이 입력됐어요."}</p>
        <button className="primary-button" onClick={saveRecord}>
          <Save size={19} aria-hidden="true" />
          저장
        </button>
      </div>

      <HealthTipCard />
      <AdUnit label="메인 기록 페이지 하단 광고" />
    </div>
  );
}

type SetRecordItem = <K extends keyof RecordItems>(key: K, value: RecordItems[K] | undefined) => void;

function MobileStepInput({ draft, onSetItem }: { draft: RecordItems; onSetItem: SetRecordItem }) {
  const [step, setStep] = useState(0);
  const field = coreRecordFieldOrder[step];
  const value = draft[field];

  const setAndAdvance: SetRecordItem = (key, nextValue) => {
    onSetItem(key, nextValue);
    if (step < coreRecordFieldOrder.length - 1) {
      window.setTimeout(() => setStep((current) => Math.min(current + 1, coreRecordFieldOrder.length - 1)), 120);
    }
  };

  return (
    <div className="mobile-step-input">
      <div className="step-head">
        <div>
          <span>
            {step + 1}/{coreRecordFieldOrder.length}
          </span>
          <strong>{recordFieldLabels[field]}</strong>
        </div>
        <small>{value === undefined ? "미입력" : "입력됨"}</small>
      </div>
      <RecordInputField field={field} items={draft} onSetItem={setAndAdvance} />
      <div className="step-actions">
        <button className="soft-button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
          이전
        </button>
        <button
          className="soft-button"
          onClick={() => setStep((current) => Math.min(coreRecordFieldOrder.length - 1, current + 1))}
          disabled={step === coreRecordFieldOrder.length - 1}
        >
          다음
        </button>
      </div>
    </div>
  );
}

function RecordInputField({
  field,
  items,
  onSetItem,
}: {
  field: RecordField;
  items: RecordItems;
  onSetItem: SetRecordItem;
}) {
  if (field === "appetite") {
    return (
      <FieldBlock icon={<CatAppetiteIcon size={20} />} title="식욕">
        <Segmented value={items.appetite} options={relativeOptions} onChange={(value) => onSetItem("appetite", value as RelativeValue)} />
      </FieldBlock>
    );
  }

  if (field === "waterIntake") {
    return (
      <FieldBlock icon={<CatWaterIcon size={20} />} title="물 섭취">
        <Segmented value={items.waterIntake} options={relativeOptions} onChange={(value) => onSetItem("waterIntake", value as RelativeValue)} />
      </FieldBlock>
    );
  }

  if (field === "stoolCount") {
    return (
      <FieldBlock icon={<CatLitterIcon size={20} />} title="배변">
        <Segmented value={items.stoolCount} options={countOptions} onChange={(value) => onSetItem("stoolCount", value as any)} />
      </FieldBlock>
    );
  }

  if (field === "urineCount") {
    return (
      <FieldBlock icon={<CatWaterIcon size={20} />} title="소변">
        <Segmented value={items.urineCount} options={countOptions} onChange={(value) => onSetItem("urineCount", value as any)} />
      </FieldBlock>
    );
  }

  if (field === "activity") {
    return (
      <FieldBlock icon={<CatActivityIcon size={20} />} title="활동량">
        <Segmented value={items.activity} options={relativeOptions} onChange={(value) => onSetItem("activity", value as RelativeValue)} />
      </FieldBlock>
    );
  }

  if (field === "foodSnackAmount") {
    return (
      <FieldBlock icon={<CatAppetiteIcon size={20} />} title="사료/간식">
        <Segmented
          value={items.foodSnackAmount}
          options={relativeOptions}
          onChange={(value) => onSetItem("foodSnackAmount", value as RelativeValue)}
        />
      </FieldBlock>
    );
  }

  if (field === "condition") {
    return (
      <FieldBlock icon={<CatConditionIcon size={20} />} title="컨디션">
        <Segmented value={items.condition} options={conditionOptions} onChange={(value) => onSetItem("condition", value as ConditionValue)} />
      </FieldBlock>
    );
  }

  if (field === "vomit") {
    return (
      <FieldBlock icon={<CatVomitIcon size={20} />} title="구토">
        <Segmented
          value={items.vomit}
          options={[
            { value: false, label: "없음" },
            { value: true, label: "있음" },
          ]}
          onChange={(value) => onSetItem("vomit", value as boolean)}
        />
      </FieldBlock>
    );
  }

  if (field === "medicationTaken") {
    return (
      <FieldBlock icon={<CatMedIcon size={20} />} title="약 복용">
        <Segmented
          value={items.medicationTaken}
          options={[
            { value: false, label: "안함" },
            { value: true, label: "함" },
          ]}
          onChange={(value) => onSetItem("medicationTaken", value as boolean)}
        />
      </FieldBlock>
    );
  }

  if (field === "weightKg") {
    return (
      <FieldBlock icon={<CatWeightIcon size={20} />} title="체중">
        <div className="weight-input-wrap">
          <input
            className="weight-input"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00kg (소수점 가능)"
            value={items.weightKg ?? ""}
            onChange={(event) => onSetItem("weightKg", event.target.value ? Number(event.target.value) : undefined)}
          />
          <span style={{ alignSelf: "center", fontWeight: 800 }}>kg</span>
        </div>
      </FieldBlock>
    );
  }

  return null;
}

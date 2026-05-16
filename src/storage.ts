import type {
  AppData,
  CatProfile,
  DailyRecord,
  MonthlyExport,
  RecordField,
  RecordItems,
} from "./types";
import { recordFieldOrder } from "./types";

const STORAGE_KEY = "mylovecat:data:v1";

export const emptyData: AppData = {
  cats: [],
  records: [],
  settings: {
    reminderTime: "21:00",
  },
};

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData;

  try {
    const parsed = JSON.parse(raw) as Partial<AppData>;

    return {
      cats: Array.isArray(parsed.cats) ? parsed.cats : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      settings: {
        reminderTime: parsed.settings?.reminderTime ?? "21:00",
        lastReminderDate: parsed.settings?.lastReminderDate,
      },
    };
  } catch {
    return emptyData;
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function makeId(prefix: string) {
  if ("crypto" in window && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function todayString() {
  return formatDate(new Date());
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthKey(dateString: string) {
  return dateString.slice(0, 7);
}

export function parseDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`);
}

export function addDays(dateString: string, delta: number) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + delta);
  return formatDate(date);
}

export function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function monthStartWeekday(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).getDay();
}

export function findRecord(records: DailyRecord[], catId: string, date: string) {
  return records.find((record) => record.catId === catId && record.date === date);
}

export function compactItems(items: RecordItems): RecordItems {
  const compacted: RecordItems = {};

  for (const key of recordFieldOrder) {
    const value = items[key];
    if (value === undefined || value === null) continue;
    Object.assign(compacted, { [key]: value });
  }

  return compacted;
}

export function missingFields(items: RecordItems): RecordField[] {
  return recordFieldOrder.filter((key) => items[key] === undefined || items[key] === null);
}

export function filledCount(items: RecordItems) {
  return recordFieldOrder.length - missingFields(items).length;
}

export function upsertRecord(records: DailyRecord[], record: DailyRecord) {
  const index = records.findIndex((item) => item.catId === record.catId && item.date === record.date);
  if (index === -1) return [...records, record].sort(sortRecordsAsc);

  const next = records.slice();
  next[index] = record;
  return next.sort(sortRecordsAsc);
}

export function sortRecordsAsc(a: DailyRecord, b: DailyRecord) {
  return a.date.localeCompare(b.date) || a.catId.localeCompare(b.catId);
}

export function sortRecordsDesc(a: DailyRecord, b: DailyRecord) {
  return b.date.localeCompare(a.date) || a.catId.localeCompare(b.catId);
}

export function deleteCat(data: AppData, catId: string): AppData {
  return {
    ...data,
    cats: data.cats.filter((cat) => cat.id !== catId),
    records: data.records.filter((record) => record.catId !== catId),
  };
}

export function buildMonthlyExport(data: AppData, month: string, timezone: string): MonthlyExport {
  const records = data.records.filter((record) => record.date.startsWith(month));
  const catIds = new Set(records.map((record) => record.catId));
  const cats = data.cats.filter((cat) => catIds.has(cat.id));

  return {
    schemaVersion: 1,
    app: {
      name: "mylovecat",
      exportedAt: new Date().toISOString(),
    },
    period: {
      month,
      timezone,
    },
    cats,
    records,
  };
}

export function mergeMonthlyExport(data: AppData, monthly: MonthlyExport): AppData {
  if (monthly.schemaVersion !== 1 || monthly.app?.name !== "mylovecat") {
    throw new Error("지원하지 않는 파일입니다.");
  }

  const catMap = new Map<string, CatProfile>();
  for (const cat of data.cats) catMap.set(cat.id, cat);
  for (const cat of monthly.cats ?? []) catMap.set(cat.id, cat);

  const recordMap = new Map<string, DailyRecord>();
  for (const record of data.records) recordMap.set(`${record.catId}:${record.date}`, record);
  for (const record of monthly.records ?? []) recordMap.set(`${record.catId}:${record.date}`, record);

  return {
    ...data,
    cats: Array.from(catMap.values()),
    records: Array.from(recordMap.values()).sort(sortRecordsAsc),
  };
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

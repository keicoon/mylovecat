import type {
  AppData,
  CatProfile,
  DailyRecord,
  ImageAsset,
  MonthlyExport,
  RecordField,
  RecordItems,
} from "./types";
import { coreRecordFieldOrder, recordFieldOrder } from "./types";
import { isThemeMode, normalizeCustomTheme } from "./theme";

const LOCAL_STORAGE_KEY = "mylovecat:data:v1";
const DB_NAME = "mylovecat";
const DB_VERSION = 2; // Upgraded version
const STORE_APP = "app";
const STORE_RECORDS = "records";
const STORE_IMAGES = "images";
const APP_DATA_KEY = "state:v1";

export const emptyData: AppData = {
  cats: [],
  records: [],
  settings: {
    reminderTime: "21:00",
    theme: "system",
  },
};

export async function loadData(): Promise<AppData> {
  if (!("indexedDB" in window)) {
    return loadLocalData().data;
  }

  try {
    const db = await openDatabase();
    
    // Check if migration is needed from state:v1
    const oldData = await idbGet<AppData>(db, STORE_APP, APP_DATA_KEY);
    
    if (oldData && oldData.records.length > 0) {
      // Migrate old monolithic data to granular stores
      await migrateToGranular(db, oldData);
      // After migration, we can delete the old monolithic key or keep it as backup.
      // For safety, we keep it but it won't be used anymore.
    }

    // Load granular data
    const catsAndSettings = await idbGet<{ cats: CatProfile[]; settings: any }>(db, STORE_APP, "app_state");
    const records = await idbGetAll<DailyRecord>(db, STORE_RECORDS);

    if (catsAndSettings) {
      return normalizeData({
        ...catsAndSettings,
        records: records.sort(sortRecordsAsc),
      });
    }

    // Fallback to localStorage if no DB data
    const local = loadLocalData();
    if (local.exists) {
      await migrateToGranular(db, local.data);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return local.data;
    }

    return emptyData;
  } catch (error) {
    console.error("Failed to load data from IndexedDB", error);
    return loadLocalData().data;
  }
}

export async function saveData(data: AppData) {
  if (!("indexedDB" in window)) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return;
  }

  try {
    const db = await openDatabase();
    
    // Save cats and settings
    await idbSet(db, STORE_APP, "app_state", {
      cats: data.cats,
      settings: data.settings,
    });

    // Save records granularly (only changed ones if we had a way to track, but for now we batch)
    // To be efficient, we only save the records that are passed.
    // In TrackerApp, saveData is called with the full AppData whenever it changes.
    // Optimization: only put records.
    const transaction = db.transaction(STORE_RECORDS, "readwrite");
    const store = transaction.objectStore(STORE_RECORDS);
    for (const record of data.records) {
      store.put(record, record.id);
    }
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn("Failed to save to IndexedDB", error);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }
}

async function migrateToGranular(db: IDBDatabase, data: AppData) {
  const tx = db.transaction([STORE_APP, STORE_RECORDS, STORE_IMAGES], "readwrite");
  
  // Save app state
  tx.objectStore(STORE_APP).put({ cats: data.cats, settings: data.settings }, "app_state");
  
  // Save records
  const recordStore = tx.objectStore(STORE_RECORDS);
  const imageStore = tx.objectStore(STORE_IMAGES);
  
  for (const record of data.records) {
    // Extract images if they are Base64 and move to images store
    if (record.items.photos) {
      for (const photo of record.items.photos) {
        if (photo.dataUrl.startsWith("data:")) {
          const blob = await dataUrlToBlob(photo.dataUrl);
          await imageStore.put(blob, photo.id);
          // In the record, we can eventually remove dataUrl to save space, 
          // but we'll keep it for now to avoid breaking UI that expects it.
        }
      }
    }
    recordStore.put(record, record.id);
  }

  // Also migrate cat avatars
  for (const cat of data.cats) {
    if (cat.avatarImage?.dataUrl.startsWith("data:")) {
      const blob = await dataUrlToBlob(cat.avatarImage.dataUrl);
      await imageStore.put(blob, cat.avatarImage.id);
    }
  }

  // Remove the old monolithic key
  tx.objectStore(STORE_APP).delete(APP_DATA_KEY);

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadLocalData() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return { exists: false, data: emptyData };

  try {
    return { exists: true, data: normalizeData(JSON.parse(raw) as Partial<AppData>) };
  } catch {
    return { exists: false, data: emptyData };
  }
}

function normalizeData(data: Partial<AppData>): AppData {
  return {
    cats: Array.isArray(data.cats) ? data.cats : [],
    records: Array.isArray(data.records) ? data.records : [],
    settings: {
      reminderTime: data.settings?.reminderTime ?? "21:00",
      theme: isThemeMode(data.settings?.theme) ? data.settings.theme : "system",
      customTheme: normalizeCustomTheme(data.settings?.customTheme),
      lastReminderDate: data.settings?.lastReminderDate,
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_APP)) {
        db.createObjectStore(STORE_APP);
      }
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS);
      }
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        db.createObjectStore(STORE_IMAGES);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB를 열 수 없어요."));
    request.onblocked = () => reject(new Error("IndexedDB 업그레이드가 차단됐어요."));
  });
}

function idbGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbGetAll<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

function idbSet(db: IDBDatabase, storeName: string, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getImage(id: string): Promise<Blob | undefined> {
  if (!("indexedDB" in window)) return undefined;
  const db = await openDatabase();
  return idbGet<Blob>(db, STORE_IMAGES, id);
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  if (!("indexedDB" in window)) return;
  const db = await openDatabase();
  await idbSet(db, STORE_IMAGES, id, blob);
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
  const note = items.note?.trim();
  if (note) compacted.note = note;
  if (items.photos?.length) compacted.photos = items.photos;
  return compacted;
}

export function missingFields(items: RecordItems): RecordField[] {
  return recordFieldOrder.filter((key) => items[key] === undefined || items[key] === null);
}

export function filledCount(items: RecordItems) {
  return recordFieldOrder.length - missingFields(items).length;
}

export function missingCoreFields(items: RecordItems): RecordField[] {
  return coreRecordFieldOrder.filter((key) => items[key] === undefined || items[key] === null);
}

export function filledCoreCount(items: RecordItems) {
  return coreRecordFieldOrder.length - missingCoreFields(items).length;
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
  for (const cat of monthly.cats ?? []) {
    const existing = catMap.get(cat.id);
    if (!existing || (cat as any).updatedAt > (existing as any).updatedAt) {
      catMap.set(cat.id, cat);
    }
  }

  const recordMap = new Map<string, DailyRecord>();
  for (const record of data.records) recordMap.set(`${record.catId}:${record.date}`, record);
  for (const record of monthly.records ?? []) {
    const key = `${record.catId}:${record.date}`;
    const existing = recordMap.get(key);
    if (!existing || record.updatedAt > existing.updatedAt) {
      recordMap.set(key, record);
    }
  }

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

export async function estimateStorageUsage() {
  if (!navigator.storage?.estimate) return undefined;
  return navigator.storage.estimate();
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return undefined;
  return navigator.storage.persist();
}

export function readImageAsset(file: File, options?: { maxEdge?: number; quality?: number }): Promise<ImageAsset> {
  const maxEdge = options?.maxEdge ?? 960;
  const quality = options?.quality ?? 0.84;

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("이미지 파일만 업로드할 수 있어요."));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("이미지 처리에 실패했어요."));
          return;
        }
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const imageId = makeId("image");
        
        // Save to granular storage if possible
        if ("indexedDB" in window) {
          const blob = await dataUrlToBlob(dataUrl);
          await saveImage(imageId, blob);
        }

        resolve({
          id: imageId,
          name: file.name,
          type: "image/jpeg",
          dataUrl, // Still provide dataUrl for immediate preview
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없어요."));
    };
    image.src = url;
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

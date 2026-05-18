export type CatSex = "male" | "female" | "unknown";
export type RelativeValue = "decreased" | "same" | "increased";
export type ConditionValue = "bad" | "normal" | "good";
export type ThemeMode = "system" | "light" | "dark" | "calico" | "custom";
export type ThemeColorKey =
  | "ink"
  | "muted"
  | "line"
  | "softLine"
  | "surface"
  | "surface2"
  | "base"
  | "brand"
  | "brandText"
  | "green"
  | "mint"
  | "coral"
  | "amber"
  | "violet";

export type ThemeColors = Partial<Record<ThemeColorKey, string>>;

export interface CustomTheme {
  schemaVersion: 1;
  app: "mylovecat-theme";
  name: string;
  colors: ThemeColors;
}

export interface ImageAsset {
  id: string;
  name: string;
  type: string;
  dataUrl?: string; // Optional: can be loaded lazily from binary storage
  createdAt: string;
}

export interface CatProfile {
  id: string;
  name: string;
  ageYears?: number;
  sex: CatSex;
  neutered: boolean;
  avatarImage?: ImageAsset;
}

export interface RecordItems {
  appetite?: RelativeValue;
  waterIntake?: RelativeValue;
  stoolCount?: 0 | 1 | 2 | 3 | 4;
  urineCount?: 0 | 1 | 2 | 3 | 4;
  vomit?: boolean;
  activity?: RelativeValue;
  weightKg?: number;
  medicationTaken?: boolean;
  foodSnackAmount?: RelativeValue;
  condition?: ConditionValue;
  note?: string;
  photos?: ImageAsset[];
}

export interface DailyRecord {
  id: string;
  catId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  items: RecordItems;
}

export interface AppSettings {
  reminderTime: string;
  theme: ThemeMode;
  customTheme?: CustomTheme;
  lastReminderDate?: string;
  weeklyReportEnabled?: boolean;
}

export interface AppData {
  cats: CatProfile[];
  records: DailyRecord[];
  settings: AppSettings;
}

export interface MonthlyExport {
  schemaVersion: 1;
  app: {
    name: "mylovecat";
    exportedAt: string;
  };
  period: {
    month: string;
    timezone: string;
  };
  cats: CatProfile[];
  records: DailyRecord[];
}

export type RecordField = Exclude<keyof RecordItems, "note" | "photos">;

export const recordFieldLabels: Record<RecordField, string> = {
  appetite: "식욕",
  waterIntake: "물 섭취",
  stoolCount: "배변",
  urineCount: "소변",
  vomit: "구토",
  activity: "활동량",
  weightKg: "체중",
  medicationTaken: "약 복용",
  foodSnackAmount: "사료/간식",
  condition: "컨디션",
};

export const recordFieldOrder: RecordField[] = [
  "appetite",
  "waterIntake",
  "stoolCount",
  "urineCount",
  "activity",
  "foodSnackAmount",
  "condition",
  "vomit",
  "weightKg",
  "medicationTaken",
];

export const coreRecordFieldOrder: RecordField[] = [
  "appetite",
  "waterIntake",
  "stoolCount",
  "urineCount",
  "activity",
  "foodSnackAmount",
  "condition",
];

export const advancedRecordFieldOrder: RecordField[] = ["vomit", "weightKg", "medicationTaken"];

export type CatSex = "male" | "female" | "unknown";
export type RelativeValue = "decreased" | "same" | "increased";
export type ConditionValue = "bad" | "normal" | "good";

export interface CatProfile {
  id: string;
  name: string;
  ageYears?: number;
  sex: CatSex;
  neutered: boolean;
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
  lastReminderDate?: string;
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

export type RecordField = keyof RecordItems;

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
  "vomit",
  "activity",
  "weightKg",
  "medicationTaken",
  "foodSnackAmount",
  "condition",
];

import type { CatProfile, CatSex, ConditionValue, DailyRecord, RelativeValue } from "./types";
import { formatDate, monthKey, parseDate } from "./storage";
import { t } from "./i18n";

export function getAttentionItems(record: DailyRecord) {
  const alerts: string[] = [];
  const { items } = record;

  if (items.vomit) alerts.push(t("fields.vomit"));
  if (items.appetite === "decreased") alerts.push(`${t("fields.appetite")} ${t("values.decreased")}`);
  if (items.waterIntake === "increased") alerts.push(`${t("fields.waterIntake")} ${t("values.increased")}`);
  if (items.waterIntake === "decreased") alerts.push(`${t("fields.waterIntake")} ${t("values.decreased")}`);
  if (items.stoolCount === 0) alerts.push(`${t("fields.stoolCount")} ${t("common.none")}`);
  if (items.stoolCount === 4) alerts.push(`${t("fields.stoolCount")} 4+`);
  if (items.urineCount === 0) alerts.push(`${t("fields.urineCount")} ${t("common.none")}`);
  if (items.urineCount === 4) alerts.push(`${t("fields.urineCount")} 4+`);
  if (items.activity === "decreased") alerts.push(`${t("fields.activity")} ${t("values.decreased")}`);
  if (items.foodSnackAmount === "decreased") alerts.push(`${t("fields.foodSnackAmount")} ${t("values.decreased")}`);
  if (items.condition === "bad") alerts.push(`${t("fields.condition")} ${t("values.bad")}`);

  return alerts;
}

export function countAttentionItems(records: DailyRecord[]) {
  const counts: Record<string, number> = {};

  for (const record of records) {
    for (const item of getAttentionItems(record)) {
      counts[item] = (counts[item] ?? 0) + 1;
    }
  }

  return counts;
}

export function buildVetReportText(cat: CatProfile, records: DailyRecord[], fromDate: string, toDate: string) {
  const attentionCounts = countAttentionItems(records);
  const latestWeight = [...records].reverse().find((record) => record.items.weightKg !== undefined)?.items.weightKg;
  const noteRecords = records.filter((record) => record.items.note || record.items.photos?.length);
  const lines = [
    `MyLoveCat 수의사 공유 리포트`,
    `고양이: ${cat.name}`,
    `프로필: ${cat.ageYears ?? "-"}세 / ${formatSex(cat.sex)} / ${cat.neutered ? t("common.neutered") : t("common.notNeutered")}`,
    `기간: ${fromDate} - ${toDate}`,
    `기록일: ${records.length}일`,
    `최근 체중: ${latestWeight ? `${latestWeight}kg` : "-"}`,
    "",
    "주의 항목:",
    Object.keys(attentionCounts).length
      ? Object.entries(attentionCounts)
          .map(([label, count]) => `- ${label}: ${count}`)
          .join("\n")
      : "- 없음",
    "",
    "일자별 기록:",
    ...records.map((record) => {
      const items = record.items;
      return [
        `${record.date}`,
        `${t("fields.appetite")} ${formatRelative(items.appetite)}`,
        `${t("fields.waterIntake")} ${formatRelative(items.waterIntake)}`,
        `${t("fields.stoolCount")} ${formatCount(items.stoolCount)}`,
        `${t("fields.urineCount")} ${formatCount(items.urineCount)}`,
        `${t("fields.vomit")} ${items.vomit === undefined ? "-" : items.vomit ? t("common.existence") : t("common.none")}`,
        `${t("fields.activity")} ${formatRelative(items.activity)}`,
        `${t("fields.condition")} ${formatCondition(items.condition)}`,
        `${t("fields.weightKg")} ${items.weightKg ? `${items.weightKg}kg` : "-"}`,
        `주의 ${getAttentionItems(record).join(", ") || "-"}`,
        items.note ? `메모 ${items.note}` : undefined,
        items.photos?.length ? `사진 ${items.photos.length}장` : undefined,
      ]
        .filter(Boolean)
        .join(" / ");
    }),
    "",
    `메모/사진 기록일: ${noteRecords.length}일`,
  ];

  return lines.join("\n");
}

export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  return monthKey(formatDate(date));
}

export function formatKoreanDate(dateString: string) {
  return parseDate(dateString).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function formatRelative(value?: RelativeValue) {
  if (value === "decreased") return t("values.decreased");
  if (value === "same") return t("values.same");
  if (value === "increased") return t("values.increased");
  return "-";
}

export function formatCondition(value?: ConditionValue) {
  if (value === "bad") return t("values.bad");
  if (value === "normal") return t("values.normal");
  if (value === "good") return t("values.good");
  return "-";
}

export function formatCount(value?: number) {
  if (value === undefined) return "-";
  return value === 4 ? "4+" : String(value);
}

export function formatSex(value: CatSex) {
  if (value === "female") return t("common.female");
  if (value === "male") return t("common.male");
  return t("common.unknown");
}

export function formatBytes(value: number) {
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)}KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)}MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)}GB`;
}

export function getWeeklyHealthSummary(records: DailyRecord[]): string {
  if (records.length === 0) return "아직 기록이 없어요. 루나의 첫 기록을 시작해 보세요!";

  const latestRecords = records.slice(0, 7);
  const alerts = latestRecords.flatMap((r) => getAttentionItems(r));
  const uniqueAlerts = Array.from(new Set(alerts));

  const appetiteDecreased = latestRecords.filter((r) => r.items.appetite === "decreased").length;
  const vomitCount = latestRecords.filter((r) => r.items.vomit).length;
  const waterDecreased = latestRecords.filter((r) => r.items.waterIntake === "decreased").length;

  let summary = "최근 7일 요약: ";

  if (uniqueAlerts.length === 0) {
    summary += "모든 지표가 아주 좋아요! 평온한 일상을 보내고 있네요. 🐾";
  } else {
    const issues = [];
    if (appetiteDecreased >= 2) issues.push(`${t("fields.appetite")}가 줄어든 날이 잦아요`);
    if (vomitCount >= 2) issues.push(`${t("fields.vomit")}가 반복되고 있어요`);
    if (waterDecreased >= 2) issues.push(`${t("fields.waterIntake")}량이 평소보다 낮아요`);

    if (issues.length > 0) {
      summary += `${issues.join(", ")}. 주의 깊은 관찰이 필요해요.`;
    } else {
      summary += `특이사항(${uniqueAlerts.join(", ")})이 간헐적으로 보이지만 전반적으로 안정적이에요.`;
    }
  }

  return summary;
}

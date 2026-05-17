import type { CatProfile, CatSex, ConditionValue, DailyRecord, RelativeValue } from "./types";
import { formatDate, monthKey, parseDate } from "./storage";

export function getAttentionItems(record: DailyRecord) {
  const alerts: string[] = [];
  const { items } = record;

  if (items.vomit) alerts.push("구토");
  if (items.appetite === "decreased") alerts.push("식욕 감소");
  if (items.waterIntake === "increased") alerts.push("음수 증가");
  if (items.waterIntake === "decreased") alerts.push("음수 감소");
  if (items.stoolCount === 0) alerts.push("배변 없음");
  if (items.stoolCount === 4) alerts.push("배변 4+");
  if (items.urineCount === 0) alerts.push("소변 없음");
  if (items.urineCount === 4) alerts.push("소변 4+");
  if (items.activity === "decreased") alerts.push("활동 감소");
  if (items.foodSnackAmount === "decreased") alerts.push("사료/간식 감소");
  if (items.condition === "bad") alerts.push("컨디션 나쁨");

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
    `프로필: ${cat.ageYears ?? "-"}세 / ${formatSex(cat.sex)} / ${cat.neutered ? "중성화" : "미중성화"}`,
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
        `식욕 ${formatRelative(items.appetite)}`,
        `물 ${formatRelative(items.waterIntake)}`,
        `배변 ${formatCount(items.stoolCount)}`,
        `소변 ${formatCount(items.urineCount)}`,
        `구토 ${items.vomit === undefined ? "-" : items.vomit ? "있음" : "없음"}`,
        `활동 ${formatRelative(items.activity)}`,
        `컨디션 ${formatCondition(items.condition)}`,
        `체중 ${items.weightKg ? `${items.weightKg}kg` : "-"}`,
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
  if (value === "decreased") return "감소";
  if (value === "same") return "비슷";
  if (value === "increased") return "증가";
  return "-";
}

export function formatCondition(value?: ConditionValue) {
  if (value === "bad") return "나쁨";
  if (value === "normal") return "보통";
  if (value === "good") return "좋음";
  return "-";
}

export function formatCount(value?: number) {
  if (value === undefined) return "-";
  return value === 4 ? "4+" : String(value);
}

export function formatSex(value: CatSex) {
  if (value === "female") return "암컷";
  if (value === "male") return "수컷";
  return "모름";
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
    if (appetiteDecreased >= 2) issues.push("식욕이 줄어든 날이 잦아요");
    if (vomitCount >= 2) issues.push("구토가 반복되고 있어요");
    if (waterDecreased >= 2) issues.push("음수량이 평소보다 낮아요");

    if (issues.length > 0) {
      summary += `${issues.join(", ")}. 주의 깊은 관찰이 필요해요.`;
    } else {
      summary += `특이사항(${uniqueAlerts.join(", ")})이 간헐적으로 보이지만 전반적으로 안정적이에요.`;
    }
  }

  return summary;
}

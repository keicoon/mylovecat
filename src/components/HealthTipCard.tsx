import React from "react";
import { Lightbulb } from "lucide-react";

const TIPS = [
  {
    title: "음수량의 변화",
    content: "평소보다 물을 너무 많이 마시거나 감자(소변 덩어리) 크기가 갑자기 커졌다면 신장 질환이나 당뇨의 신호일 수 있습니다.",
  },
  {
    title: "식욕 부진",
    content: "고양이가 24시간 이상 아무것도 먹지 않는다면 '지방간' 위험이 있으므로 즉시 수의사와 상담해야 합니다.",
  },
  {
    title: "그루밍 상태",
    content: "털이 푸석해지거나 특정 부위만 과도하게 그루밍한다면 통증이나 스트레스, 알레르기 반응일 수 있습니다.",
  },
  {
    title: "활동량 감소",
    content: "나이가 들며 활동량이 주는 것은 자연스럽지만, 좋아하는 장난감에도 반응이 없다면 관절염 등 통증을 숨기고 있을 수 있습니다.",
  },
  {
    title: "정상 체중 유지",
    content: "체중의 5% 변화는 사람으로 치면 수 kg의 변화와 같습니다. 정기적인 체중 측정은 가장 기초적인 건강 관리입니다.",
  },
];

export function HealthTipCard() {
  // Use a simple hash based on today's date to pick a tip of the day
  const today = new Date();
  const index = (today.getFullYear() * 31 + today.getMonth() * 7 + today.getDate());
  const tip = TIPS[index % TIPS.length];

  return (
    <div className="health-tip-card panel">
      <div className="tip-header">
        <Lightbulb size={18} color="var(--amber)" />
        <h4>오늘의 고양이 건강 정보</h4>
      </div>
      <div className="tip-content">
        <strong>{tip.title}</strong>
        <p>{tip.content}</p>
      </div>
      <style>{`
        .health-tip-card {
          margin-top: 16px;
          padding: 16px;
          border-left: 4px solid var(--amber);
        }
        .tip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: var(--amber);
        }
        .tip-header h4 {
          margin: 0;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .tip-content strong {
          display: block;
          margin-bottom: 4px;
          font-size: 1rem;
        }
        .tip-content p {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.5;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}

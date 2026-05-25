import React from "react";
import { Cat, ClipboardList, HeartPulse, ShieldCheck, Info } from "lucide-react";
import type { CatProfile } from "../types";
import { CatForm } from "../components/CatForm";
import { t } from "../i18n";

export function SetupView({ onAddCat }: { onAddCat: (cat: Omit<CatProfile, "id">) => void }) {
  return (
    <section className="setup-grid">
      <div className="setup-copy">
        <div className="brand-mark large">
          <Cat aria-hidden="true" size={34} />
        </div>
        <h1>MyLoveCat과 함께 시작하세요.</h1>
        <p>고양이의 소중한 하루를 기록하고 건강 변화를 추적하는 가장 쉬운 방법입니다.</p>
      </div>

      <CatForm submitLabel={t("common.add")} onSubmit={onAddCat} />

      <div className="setup-info-section">
        <div className="panel info-banner">
          <Info size={20} />
          <div>
            <h3>왜 기록이 중요한가요?</h3>
            <p>
              고양이는 아픈 것을 숨기는 본능이 있습니다. 식욕, 음수량, 배변 횟수의 미세한 변화를 매일 기록하면 
              질병을 조기에 발견하고 수의사에게 정확한 정보를 전달할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="setup-features">
          <div className="feature-item">
            <ClipboardList size={24} />
            <h4>간편한 데일리 체크</h4>
            <p>바쁜 일상에서도 1분이면 충분합니다. 식욕부터 컨디션까지 핵심 항목을 빠르게 남기세요.</p>
          </div>
          <div className="feature-item">
            <HeartPulse size={24} />
            <h4>건강 신호 추적</h4>
            <p>체중 변화와 구토 횟수 등을 그래프로 확인하며 이상 징후를 놓치지 마세요.</p>
          </div>
          <div className="feature-item">
            <ShieldCheck size={24} />
            <h4>안전한 로컬 저장</h4>
            <p>모든 데이터는 기기에 직접 저장됩니다. 개인정보 걱정 없이 안심하고 사용하세요.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

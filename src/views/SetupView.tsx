import React from "react";
import { Cat } from "lucide-react";
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
        <h2>고양이 프로필을 추가하세요.</h2>
        <p>첫 기록을 시작할 준비가 됩니다.</p>
      </div>
      <CatForm submitLabel={t("common.add")} onSubmit={onAddCat} />
    </section>
  );
}

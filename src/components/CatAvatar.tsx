import React from "react";
import { Cat } from "lucide-react";
import type { CatProfile } from "../types";
import { SmartImage } from "./CommonUI";

export function CatAvatar({
  cat,
  size,
  streak = 0,
}: {
  cat: Pick<CatProfile, "name" | "avatarImage">;
  size: "chip" | "large";
  streak?: number;
}) {
  return (
    <div className={`avatar-container ${size}`}>
      <span className={`cat-avatar ${size}`} aria-hidden="true">
        {cat.avatarImage ? <SmartImage asset={cat.avatarImage} alt="" /> : <Cat size={size === "large" ? 32 : 15} />}
      </span>
      {size === "large" && streak >= 30 ? (
        <div className="avatar-decoration medal" title="30일 연속 기록 훈장">
          🏅
        </div>
      ) : size === "large" && streak >= 7 ? (
        <div className="avatar-decoration crown" title="7일 연속 기록 왕관">
          👑
        </div>
      ) : null}
    </div>
  );
}

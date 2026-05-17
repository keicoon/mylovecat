import { Cat } from "lucide-react";
import { CatProfile } from "../types";

export function CatAvatar({ cat, size }: { cat: Pick<CatProfile, "name" | "avatarImage">; size: "chip" | "large" }) {
  return (
    <span className={`cat-avatar ${size}`} aria-hidden="true">
      {cat.avatarImage ? <img src={cat.avatarImage.dataUrl} alt="" /> : <Cat size={size === "large" ? 32 : 15} />}
    </span>
  );
}

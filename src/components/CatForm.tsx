import React, { useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Plus, X } from "lucide-react";
import type { CatProfile, CatSex, ImageAsset } from "../types";
import { readImageAsset } from "../storage";
import { CatAvatar } from "./CatAvatar";
import { Segmented } from "./Segmented";

export function CatForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: CatProfile;
  submitLabel: string;
  onSubmit: (cat: Omit<CatProfile, "id">) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [ageYears, setAgeYears] = useState(initial?.ageYears?.toString() ?? "");
  const [sex, setSex] = useState<CatSex>(initial?.sex ?? "unknown");
  const [neutered, setNeutered] = useState(initial?.neutered ?? true);
  const [avatarImage, setAvatarImage] = useState<ImageAsset | undefined>(initial?.avatarImage);
  const [imageError, setImageError] = useState("");

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImageError("");
      setAvatarImage(await readImageAsset(file, { maxEdge: 420, quality: 0.82 }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "대표 이미지를 읽을 수 없어요.");
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      ageYears: ageYears === "" ? undefined : Number(ageYears),
      sex,
      neutered,
      avatarImage,
    });
    if (!initial) {
      setName("");
      setAgeYears("");
      setSex("unknown");
      setNeutered(true);
      setAvatarImage(undefined);
      setImageError("");
    }
  };

  return (
    <div className="cat-form">
      <div className="avatar-picker">
        <CatAvatar
          cat={{
            name: name || "preview",
            avatarImage,
          }}
          size="large"
        />
        <div className="avatar-actions">
          <label className="soft-button file-button">
            <Camera size={18} aria-hidden="true" />
            대표 이미지
            <input type="file" accept="image/*" onChange={changeAvatar} />
          </label>
          {avatarImage ? (
            <button className="micro-button" onClick={() => setAvatarImage(undefined)} type="button">
              제거
            </button>
          ) : null}
        </div>
        {imageError ? <p className="form-error">{imageError}</p> : null}
      </div>
      <label>
        나이
        <input
          value={ageYears}
          onChange={(event) => setAgeYears(event.target.value)}
          inputMode="decimal"
          type="number"
          min="0"
          step="0.1"
          placeholder="세 (예: 2.5)"
        />
      </label>
      <div className="form-group">
        <span>성별</span>
        <Segmented
          value={sex}
          options={[
            { value: "female" as const, label: "암컷" },
            { value: "male" as const, label: "수컷" },
            { value: "unknown" as const, label: "모름" },
          ]}
          onChange={(val) => setSex(val as CatSex)}
        />
      </div>
      <div className="form-group">
        <span>중성화</span>
        <Segmented
          value={neutered}
          options={[
            { value: true, label: "예" },
            { value: false, label: "아니오" },
          ]}
          onChange={(val) => setNeutered(val as boolean)}
        />
      </div>
      <div className="form-actions">
        {onCancel ? (
          <button className="soft-button" onClick={onCancel}>
            취소
          </button>
        ) : null}
        <button className="primary-button" onClick={submit} disabled={!name.trim()}>
          <Plus size={18} aria-hidden="true" />
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

export function ImageGrid({ images, onRemove }: { images: ImageAsset[]; onRemove?: (imageId: string) => void }) {
  return (
    <div className="image-grid">
      {images.map((image) => (
        <figure className="image-thumb" key={image.id}>
          <img src={image.dataUrl} alt={image.name} />
          {onRemove ? (
            <button type="button" onClick={() => onRemove(image.id)} aria-label={`${image.name} 제거`}>
              <X size={15} aria-hidden="true" />
            </button>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

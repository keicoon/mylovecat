import { useEffect } from "react";
import { Monitor } from "lucide-react";

export function AdUnit({ label }: { label: string }) {
  const ADSENSE_CLIENT = sanitizeAdSenseClient(import.meta.env.VITE_ADSENSE_CLIENT);
  const ADSENSE_SLOT_CONTENT = sanitizeAdSlot(import.meta.env.VITE_ADSENSE_SLOT_CONTENT);

  useEffect(() => {
    if (!ADSENSE_CLIENT || !ADSENSE_SLOT_CONTENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, [ADSENSE_CLIENT, ADSENSE_SLOT_CONTENT]);

  if (!ADSENSE_CLIENT || !ADSENSE_SLOT_CONTENT) {
    return (
      <aside className="ad-placeholder app-ad" aria-label={label}>
        <div className="ad-inner">
          <Monitor size={16} aria-hidden="true" />
          <span>광고 공간 (준비 중)</span>
        </div>
      </aside>
    );
  }

  return (
    <div className="ad-wrapper app-ad">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT_CONTENT}
        data-ad-format="auto"
        data-full-width-responsive="true"
        aria-label={label}
      />
    </div>
  );
}

export function sanitizeAdSenseClient(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && /^ca-pub-\d{16}$/.test(trimmed) ? trimmed : "";
}

export function sanitizeAdSlot(value: string | undefined) {
  const trimmed = value?.trim();
  if (trimmed === "0000000000" || trimmed === "1234567890") return "";
  return trimmed && /^\d{4,}$/.test(trimmed) ? trimmed : "";
}

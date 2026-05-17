import React from "react";
import { Download, Smartphone, X } from "lucide-react";

export type InstallContext = {
  canPrompt: boolean;
  isStandalone: boolean;
  platform: "ios-safari" | "ios-other" | "desktop" | "installed";
  title: string;
  description: string;
  steps: string[];
};

export function InstallBanner({
  context,
  onInstall,
  onDismiss,
}: {
  context: InstallContext;
  onInstall: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="install-banner" aria-label="앱 설치 안내">
      <div className="install-banner-icon">
        <Smartphone size={22} aria-hidden="true" />
      </div>
      <div>
        <strong>{context.title}</strong>
        <p>{context.description}</p>
        <ol>
          {context.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="install-banner-actions">
        {context.canPrompt ? (
          <button className="primary-button" onClick={onInstall}>
            <Download size={18} aria-hidden="true" />
            설치
          </button>
        ) : null}
        <button className="icon-button" onClick={onDismiss} aria-label="설치 안내 닫기">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export function InstallGuideCard({
  context,
  installPromptAvailable,
  onInstall,
}: {
  context: InstallContext;
  installPromptAvailable: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="panel install-guide-card">
      <div className="panel-head compact">
        <h2>설치</h2>
      </div>
      <div className="install-guide-status">
        <Smartphone size={20} aria-hidden="true" />
        <div>
          <strong>{context.title}</strong>
          <p>{context.description}</p>
        </div>
      </div>
      <ol>
        {context.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {installPromptAvailable ? (
        <button className="primary-button" onClick={onInstall}>
          <Download size={18} aria-hidden="true" />앱 설치
        </button>
      ) : null}
    </div>
  );
}

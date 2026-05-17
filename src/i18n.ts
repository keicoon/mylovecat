import { ko } from "./locales/ko";

export type Locale = "ko"; // Currently only Korean supported

let currentLocale: Locale = "ko";

/**
 * Very simple i18n utility
 * @param path Dot notation path like 'tabs.today'
 */
export function t(path: string): string {
  const parts = path.split(".");
  let current: any = ko;

  for (const part of parts) {
    if (current[part] === undefined) {
      console.warn(`i18n: Key not found: ${path}`);
      return path;
    }
    current = current[part];
  }

  return current as string;
}

export function getLocale() {
  return currentLocale;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT_CONTENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

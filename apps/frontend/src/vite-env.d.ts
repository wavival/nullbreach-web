/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WHATSAPP_URL?: string;
  readonly VITE_AUTHOR_NAME?: string;
  readonly VITE_AUTHOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_DEV_USER: string
  readonly VITE_DEV_ROLE: string
  readonly VITE_DEV_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
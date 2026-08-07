/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_VERSION: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_GOOGLE_PROJECT_ID: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_REDIRECT_URI: string;
  readonly VITE_FEATURE_DARK_MODE: string;
  readonly VITE_FEATURE_STEWARD_EDIT: string;
  readonly VITE_FEATURE_API_TIMING: string;
  readonly VITE_IS_SERVICE_ACCOUNT: string;
  readonly VITE_SUPPORT_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

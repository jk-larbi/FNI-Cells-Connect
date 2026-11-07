/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_EMAIL_NOTIFICATION_ENABLED?: string;
  readonly VITE_WHATSAPP_NOTIFICATION_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

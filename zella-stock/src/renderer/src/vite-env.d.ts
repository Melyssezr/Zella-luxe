/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZELLA_SITE_URL?: string;
  readonly VITE_ZELLA_STOCK_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  zellaStock?: {
    version: string;
    siteRequest: (payload: { url: string; key: string; body: unknown }) => Promise<{
      ok: boolean;
      status: number;
      data: { error?: string; id?: string; published?: boolean };
    }>;
  };
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

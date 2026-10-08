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
    getVersion?: () => Promise<string>;
    listPrinters?: () => Promise<string[]>;
    printRawLabel?: (payload: {
      printerName: string;
      filePath: string;
    }) => Promise<{ ok: true; detail: string } | { ok: false; error: string }>;
    getPrintScriptPath?: () => Promise<string | null>;
    writeTempLabel?: (content: string) => Promise<string>;
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

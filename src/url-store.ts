export interface UrlStore {
  getUrl(code: string): Promise<string | null>;
  hasCode(code: string): Promise<boolean>;
  saveUrl(code: string, url: string): Promise<void>;
}

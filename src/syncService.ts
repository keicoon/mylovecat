import type { AppData } from "./types";
import { mergeMonthlyExport } from "./storage";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const TOKEN_STORAGE_KEY = "mylovecat:google:token";

let gapiInitialized = false;
let gsiInitialized = false;
let tokenClient: any = null;

export interface SyncStatus {
  signedIn: boolean;
  userEmail?: string;
  lastSyncedAt?: string;
  isSyncing: boolean;
  error?: string;
  isConfigured: boolean;
}

class GoogleSyncService {
  private status: SyncStatus = {
    signedIn: false,
    isSyncing: false,
    isConfigured: Boolean(CLIENT_ID),
  };

  private onStatusChange?: (status: SyncStatus) => void;
  private currentAccessToken: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);

  init(onStatusChange: (status: SyncStatus) => void) {
    this.onStatusChange = onStatusChange;
    if (!CLIENT_ID) {
      this.status.error = "Google Client ID가 설정되지 않았습니다.";
      this.checkInternalStatus();
      return;
    }
    this.loadScripts();
  }

  private loadScripts() {
    if (document.getElementById("gapi-script")) return;

    const gapiScript = document.createElement("script");
    gapiScript.id = "gapi-script";
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.onload = () => this.initializeGapi();
    document.body.appendChild(gapiScript);

    const gsiScript = document.createElement("script");
    gsiScript.id = "gsi-script";
    gsiScript.src = "https://accounts.google.com/gsi/client";
    gsiScript.onload = () => this.initializeGsi();
    document.body.appendChild(gsiScript);
  }

  private async initializeGapi() {
    try {
      await new Promise((resolve) => gapi.load("client", resolve));
      await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
      gapiInitialized = true;

      if (this.currentAccessToken) {
        gapi.client.setToken({ access_token: this.currentAccessToken });
        this.status.signedIn = true;
      }

      this.checkInternalStatus();
    } catch (e) {
      this.status.error = "Google API 초기화 실패";
      this.checkInternalStatus();
    }
  }

  private initializeGsi() {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (resp: any) => {
          if (resp.error) {
            this.status.error = `인증 에러: ${resp.error}`;
            this.checkInternalStatus();
            return;
          }
          this.currentAccessToken = resp.access_token;
          localStorage.setItem(TOKEN_STORAGE_KEY, resp.access_token);
          this.status.signedIn = true;
          this.status.error = undefined;
          this.checkInternalStatus();
        },
      });
      gsiInitialized = true;
      this.checkInternalStatus();
    } catch (e) {
      this.status.error = "인증 모듈 로드 실패";
      this.checkInternalStatus();
    }
  }

  private checkInternalStatus() {
    this.onStatusChange?.({ ...this.status });
  }

  async signIn() {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: this.currentAccessToken ? "" : "select_account" });
  }

  async signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        gapi.client.setToken(null);
        this.currentAccessToken = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.status.signedIn = false;
        this.status.error = undefined;
        this.checkInternalStatus();
      });
    }
  }

  async sync(localData: AppData): Promise<AppData | null> {
    if (!gapiInitialized || !this.status.signedIn) return null;

    this.status.isSyncing = true;
    this.status.error = undefined;
    this.checkInternalStatus();

    try {
      const fileId = await this.findSyncFile();

      if (fileId) {
        const res = await gapi.client.drive.files.get({
          fileId: fileId,
          alt: "media",
        });
        const remoteData = res.result as AppData;
        const merged = this.mergeData(localData, remoteData);
        await this.upload(fileId, merged);

        this.status.lastSyncedAt = new Date().toISOString();
        return merged;
      } else {
        await this.createFile(localData);
        this.status.lastSyncedAt = new Date().toISOString();
        return localData;
      }
    } catch (error: any) {
      if (error.status === 401) {
        this.status.signedIn = false;
        this.currentAccessToken = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.status.error = "인증 세션이 만료되었습니다. 다시 로그인해주세요.";
      } else {
        this.status.error = "동기화 실패 (네트워크 확인)";
      }
      return null;
    } finally {
      this.status.isSyncing = false;
      this.checkInternalStatus();
    }
  }

  async uploadOnly(data: AppData): Promise<boolean> {
    if (!gapiInitialized || !this.status.signedIn) return false;

    try {
      const fileId = await this.findSyncFile();
      if (fileId) {
        await this.upload(fileId, data);
        return true;
      } else {
        await this.createFile(data);
        return true;
      }
    } catch {
      return false;
    }
  }

  async uploadReport(filename: string, content: string): Promise<boolean> {
    if (!gapiInitialized || !this.status.signedIn) return false;

    try {
      const folderId = await this.findOrCreateFolder("MyLoveCat Reports");
      const boundary = "foo_bar_baz_report";
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: "text/plain",
      };

      const multipartRequestBody =
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: text/plain\r\n\r\n" +
        content +
        close_delim;

      await gapi.client.request({
        path: "/upload/drive/v3/files",
        method: "POST",
        params: { uploadType: "multipart" },
        headers: { "Content-Type": 'multipart/related; boundary="' + boundary + '"' },
        body: multipartRequestBody,
      });
      return true;
    } catch (error) {
      console.error("Report upload failed", error);
      return false;
    }
  }

  private async findOrCreateFolder(folderName: string): Promise<string> {
    const response = await gapi.client.drive.files.list({
      q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
    });

    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }

    const folderMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    const createResponse = await gapi.client.drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });

    return createResponse.result.id;
  }

  private async findSyncFile(): Promise<string | null> {
    const response = await gapi.client.drive.files.list({
      spaces: "appDataFolder",
      fields: "files(id, name)",
      q: "name = 'mylovecat_sync.json'",
    });
    const files = response.result.files;
    return files && files.length > 0 ? files[0].id : null;
  }

  private async createFile(data: AppData) {
    const boundary = "foo_bar_baz";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";
    const metadata = { name: "mylovecat_sync.json", parents: ["appDataFolder"] };

    const multipartRequestBody =
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      JSON.stringify(data) +
      close_delim;

    return gapi.client.request({
      path: "/upload/drive/v3/files",
      method: "POST",
      params: { uploadType: "multipart" },
      headers: { "Content-Type": 'multipart/related; boundary="' + boundary + '"' },
      body: multipartRequestBody,
    });
  }

  private async upload(fileId: string, data: AppData) {
    return gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: "PATCH",
      params: { uploadType: "media" },
      body: JSON.stringify(data),
    });
  }

  private mergeData(local: AppData, remote: AppData): AppData {
    const remoteAsExport = {
      schemaVersion: 1,
      app: { name: "mylovecat", exportedAt: new Date().toISOString() },
      period: { month: "all", timezone: "UTC" },
      cats: remote.cats || [],
      records: remote.records || [],
    };
    return mergeMonthlyExport(local, remoteAsExport as any);
  }
}

export const syncService = new GoogleSyncService();

declare const gapi: any;
declare const google: any;

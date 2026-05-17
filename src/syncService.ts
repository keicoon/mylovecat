import type { AppData } from "./types";
import { emptyData, mergeMonthlyExport, saveData } from "./storage";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.appdata";
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let gapiInitialized = false;
let gsiInitialized = false;
let tokenClient: any = null;

export interface SyncStatus {
  signedIn: boolean;
  userEmail?: string;
  lastSyncedAt?: string;
  isSyncing: boolean;
}

class GoogleSyncService {
  private status: SyncStatus = {
    signedIn: false,
    isSyncing: false,
  };

  private onStatusChange?: (status: SyncStatus) => void;

  init(onStatusChange: (status: SyncStatus) => void) {
    this.onStatusChange = onStatusChange;
    this.loadScripts();
  }

  private loadScripts() {
    const gapiScript = document.createElement("script");
    gapiScript.src = "https://apis.google.com/js/api.js";
    gapiScript.onload = () => this.initializeGapi();
    document.body.appendChild(gapiScript);

    const gsiScript = document.createElement("script");
    gsiScript.src = "https://accounts.google.com/gsi/client";
    gsiScript.onload = () => this.initializeGsi();
    document.body.appendChild(gsiScript);
  }

  private async initializeGapi() {
    await new Promise((resolve) => gapi.load("client", resolve));
    await gapi.client.init({
      discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInitialized = true;
    this.checkInternalStatus();
  }

  private initializeGsi() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (resp: any) => {
        if (resp.error) throw resp;
        this.status.signedIn = true;
        this.checkInternalStatus();
        await this.sync();
      },
    });
    gsiInitialized = true;
    this.checkInternalStatus();
  }

  private checkInternalStatus() {
    this.onStatusChange?.({ ...this.status });
  }

  async signIn() {
    if (!tokenClient) return;
    tokenClient.requestAccessToken({ prompt: "consent" });
  }

  async signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        gapi.client.setToken(null);
        this.status.signedIn = false;
        this.checkInternalStatus();
      });
    }
  }

  async sync(localData?: AppData): Promise<AppData | null> {
    if (!gapiInitialized || !this.status.signedIn) return null;

    this.status.isSyncing = true;
    this.checkInternalStatus();

    try {
      // 1. Search for existing sync file in appDataFolder
      const response = await gapi.client.drive.files.list({
        spaces: "appDataFolder",
        fields: "files(id, name)",
        q: "name = 'mylovecat_sync.json'",
      });

      const files = response.result.files;
      let fileId = files && files.length > 0 ? files[0].id : null;

      if (fileId) {
        // 2. Download remote data
        const res = await gapi.client.drive.files.get({
          fileId: fileId,
          alt: "media",
        });
        const remoteData = res.result as AppData;

        if (localData) {
          // 3. Merge if local data provided
          const merged = this.mergeData(localData, remoteData);
          await this.upload(fileId, merged);
          this.status.lastSyncedAt = new Date().toISOString();
          return merged;
        } else {
          this.status.lastSyncedAt = new Date().toISOString();
          return remoteData;
        }
      } else if (localData) {
        // 4. Create new file if doesn't exist
        const created = await this.createFile(localData);
        this.status.lastSyncedAt = new Date().toISOString();
        return localData;
      }
    } catch (error) {
      console.error("Sync failed", error);
    } finally {
      this.status.isSyncing = false;
      this.checkInternalStatus();
    }
    return null;
  }

  private async createFile(data: AppData) {
    const boundary = "foo_bar_baz";
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      name: "mylovecat_sync.json",
      parents: ["appDataFolder"],
    };

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
    // Simple merge logic using existing MonthlyExport merge utility
    // Treating remote as a master source to merge into local
    const remoteAsExport = {
      schemaVersion: 1,
      app: { name: "mylovecat", exportedAt: new Date().toISOString() },
      period: { month: "all", timezone: "UTC" },
      cats: remote.cats,
      records: remote.records,
    };
    return mergeMonthlyExport(local, remoteAsExport as any);
  }
}

export const syncService = new GoogleSyncService();

declare const gapi: any;
declare const google: any;

export interface HomeAssistantEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface FrakonDashboardCapabilities {
  readableDocumentVersions: number[];
  writableDocumentVersions: number[];
  revisionSync?: boolean;
  maxItems?: number;
}

interface ResultMessage {
  id: number;
  type: 'result';
  success: boolean;
  result?: unknown;
  error?: { code?: string; message?: string };
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(reason: Error): void;
}

export function normalizeHomeAssistantUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Home Assistant URL is required.');
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Home Assistant URL must use http:// or https://.');
  }
  url.hash = '';
  url.search = '';
  url.pathname = url.pathname.replace(/\/$/, '');
  return url.toString().replace(/\/$/, '');
}

export function homeAssistantWebSocketUrl(input: string): string {
  const base = new URL(normalizeHomeAssistantUrl(input));
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  const root = base.pathname.replace(/\/$/, '');
  base.pathname = `${root}/api/websocket`.replace(/\/+/g, '/');
  return base.toString();
}

export class HomeAssistantStudioConnection {
  private socket?: WebSocket;
  private authenticated = false;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();

  get connected(): boolean {
    return this.authenticated && this.socket?.readyState === WebSocket.OPEN;
  }

  async connect(baseUrl: string, accessToken: string): Promise<void> {
    const token = accessToken.trim();
    if (!token) throw new Error('A Home Assistant long-lived access token is required.');
    this.disconnect();

    const socket = new WebSocket(homeAssistantWebSocketUrl(baseUrl));
    this.socket = socket;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        this.authenticated = false;
        reject(new Error(message));
      };

      socket.addEventListener('error', () => fail('Could not connect to the Home Assistant WebSocket API.'));
      socket.addEventListener('close', () => {
        this.authenticated = false;
        if (!settled) fail('Home Assistant closed the connection before authentication completed.');
        this.rejectPending('Home Assistant connection closed.');
      });
      socket.addEventListener('message', (event) => {
        const message = this.parseMessage(event.data);
        if (!message) return;
        const type = typeof message.type === 'string' ? message.type : '';
        if (type === 'auth_required') {
          socket.send(JSON.stringify({ type: 'auth', access_token: token }));
          return;
        }
        if (type === 'auth_invalid') {
          const detail = typeof message.message === 'string' ? message.message : 'Authentication failed.';
          fail(detail);
          socket.close();
          return;
        }
        if (type === 'auth_ok') {
          this.authenticated = true;
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }
        this.handleResult(message);
      });
    });
  }

  disconnect(): void {
    this.authenticated = false;
    const socket = this.socket;
    this.socket = undefined;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    this.rejectPending('Home Assistant connection closed.');
  }

  async request<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    const socket = this.socket;
    if (!this.connected || !socket) throw new Error('Connect FRAKON Studio to Home Assistant first.');
    const id = this.nextId;
    this.nextId += 1;
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
    });
    socket.send(JSON.stringify({ id, type, ...payload }));
    return promise;
  }

  listEntities(): Promise<HomeAssistantEntity[]> {
    return this.request<HomeAssistantEntity[]>('get_states');
  }

  capabilities(): Promise<FrakonDashboardCapabilities> {
    return this.request<FrakonDashboardCapabilities>('frakon/dashboard/capabilities');
  }

  loadDashboard<T>(dashboardId: string): Promise<T | null> {
    return this.request<T | null>('frakon/dashboard/load', { dashboard_id: dashboardId });
  }

  async saveDashboard(document: Record<string, unknown>): Promise<void> {
    await this.request<null>('frakon/dashboard/save', { document });
  }

  private parseMessage(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'string') return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : undefined;
    } catch {
      return undefined;
    }
  }

  private handleResult(message: Record<string, unknown>): void {
    if (message.type !== 'result' || typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    const result = message as unknown as ResultMessage;
    if (result.success) {
      pending.resolve(result.result);
      return;
    }
    const code = result.error?.code ? `${result.error.code}: ` : '';
    pending.reject(new Error(`${code}${result.error?.message ?? 'Home Assistant request failed.'}`));
  }

  private rejectPending(message: string): void {
    for (const pending of this.pending.values()) pending.reject(new Error(message));
    this.pending.clear();
  }
}

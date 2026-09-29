/**
 * Push is a wake/fallback mechanism only — never the source of truth.
 * See /docs/06-API-SPEC.md §WebSocket channels.
 */
export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  sendPush(message: PushMessage): Promise<{ delivered: boolean }>;
}

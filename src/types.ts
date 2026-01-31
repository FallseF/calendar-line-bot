export interface Env {
  LINE_CHANNEL_SECRET: string;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  GOOGLE_CALENDAR_IDS: string;  // カンマ区切りで複数カレンダーID（例: "user1@gmail.com,user2@gmail.com"）
  ENVIRONMENT: string;
}

// LINE Webhook Types
export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export interface LineEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: LineMessage;
  postback?: {
    data: string;
    params?: {
      date?: string;  // 日付ピッカーの結果 (YYYY-MM-DD)
      time?: string;  // 時間ピッカーの結果 (HH:mm)
      datetime?: string;  // 日時ピッカーの結果 (YYYY-MM-DDTHH:mm)
    };
  };
}

export interface LineMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
  text?: string;
}

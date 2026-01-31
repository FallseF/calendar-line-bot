import type { Env } from '../types';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// LINE Message Types
export interface LineMessage {
  type: 'text';
  text?: string;
}

export async function replyMessage(
  env: Env,
  replyToken: string,
  text: string
): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE reply error:', error);
    throw new Error(`LINE API error: ${response.status}`);
  }
}

export async function replyFlexMessage(
  env: Env,
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LINE reply error:', error);
    throw new Error(`LINE API error: ${response.status}`);
  }
}

export async function verifySignature(
  channelSecret: string,
  body: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return signature === expectedSignature;
}

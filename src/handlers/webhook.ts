import type { Env, LineWebhookBody, LineEvent } from '../types';
import {
  replyMessage,
  replyFlexMessage,
  verifySignature,
  type LineMessage,
} from '../services/line';
import { getAllBusySlots, type BusySlot } from '../services/calendar';

export async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  console.log('=== Webhook received ===');

  // 署名検証
  const signature = request.headers.get('x-line-signature');
  if (!signature) {
    console.log('Missing signature');
    return new Response('Missing signature', { status: 401 });
  }

  const body = await request.text();

  const isValid = await verifySignature(env.LINE_CHANNEL_SECRET, body, signature);
  if (!isValid) {
    console.error('Invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }

  const webhookBody: LineWebhookBody = JSON.parse(body);
  console.log('Events count:', webhookBody.events.length);

  // 各イベントをバックグラウンドで処理
  ctx.waitUntil(
    (async () => {
      for (const event of webhookBody.events) {
        console.log('Processing event type:', event.type);
        try {
          await handleEvent(event, env);
        } catch (error) {
          console.error('Event handling error:', error);
        }
      }
    })()
  );

  return new Response('OK', { status: 200 });
}

async function handleEvent(event: LineEvent, env: Env): Promise<void> {
  if (event.type === 'follow') {
    await handleFollow(event, env);
    return;
  }

  if (event.type === 'message' && event.message?.type === 'text') {
    await handleTextMessage(event, env);
    return;
  }
}

async function handleFollow(event: LineEvent, env: Env): Promise<void> {
  if (event.replyToken) {
    const welcomeMessage = `はじめまして！
空き時間検索Botです。

チームメンバー全員のカレンダーから空き時間を検索します。

「。」を送ると空き時間を表示します。

よろしくお願いします！`;

    await replyMessage(env, event.replyToken, welcomeMessage);
  }
}

async function handleTextMessage(event: LineEvent, env: Env): Promise<void> {
  console.log('=== handleTextMessage START ===');

  try {
    const userText = event.message!.text!;
    const replyToken = event.replyToken;
    console.log('text:', userText);

    if (!replyToken) return;

    // 。コマンドまたはヘルプ
    if (userText === '。' || userText === 'help' || userText === 'ヘルプ' || userText === '/' || userText === '空き' || userText === '空き時間') {
      // 空き時間を検索
      const busySlots = await getAllBusySlots(env, 7);
      const freeSlots = findFreeTimeSlots(busySlots, 7);
      const shareText = generateFreeTimeSlotsText(freeSlots);
      await replyMessage(env, replyToken, shareText);
      return;
    }

    // それ以外は使い方を案内
    await replyMessage(env, replyToken, '「。」を送ると今週の空き時間を表示します！');

    console.log('=== handleTextMessage SUCCESS ===');
  } catch (error) {
    console.error('=== handleTextMessage ERROR ===', error);
    throw error;
  }
}

/**
 * 空き時間スロットを見つける
 */
interface FreeTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
}

function findFreeTimeSlots(busySlots: BusySlot[], days: number): FreeTimeSlot[] {
  const freeSlots: FreeTimeSlot[] = [];

  const WORK_START = 10;  // 10:00
  const WORK_END = 19;    // 19:00
  const MIN_SLOT_MINUTES = 60;  // 最低1時間の空き

  const today = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstToday = new Date(today.getTime() + jstOffset);

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(jstToday);
    targetDate.setDate(targetDate.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];

    // 土日はスキップ
    const dayOfWeek = targetDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    // その日の予定を取得してソート
    const dayBusySlots = busySlots
      .filter(slot => slot.startDate === dateStr)
      .map(slot => ({
        start: timeToMinutes(slot.startTime),
        end: timeToMinutes(slot.endTime),
      }))
      .sort((a, b) => a.start - b.start);

    // 重複する予定をマージ
    const mergedSlots: Array<{ start: number; end: number }> = [];
    for (const slot of dayBusySlots) {
      if (mergedSlots.length === 0 || slot.start > mergedSlots[mergedSlots.length - 1].end) {
        mergedSlots.push({ ...slot });
      } else {
        mergedSlots[mergedSlots.length - 1].end = Math.max(
          mergedSlots[mergedSlots.length - 1].end,
          slot.end
        );
      }
    }

    // 空き時間を計算
    let currentTime = WORK_START * 60;
    const workEnd = WORK_END * 60;

    for (const slot of mergedSlots) {
      if (slot.start > currentTime && slot.start - currentTime >= MIN_SLOT_MINUTES) {
        const slotEnd = Math.min(slot.start, workEnd);
        if (slotEnd > currentTime) {
          freeSlots.push({
            date: dateStr,
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(slotEnd),
          });
        }
      }
      currentTime = Math.max(currentTime, slot.end);
    }

    // 最後の予定以降の空き
    if (currentTime < workEnd && workEnd - currentTime >= MIN_SLOT_MINUTES) {
      freeSlots.push({
        date: dateStr,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(workEnd),
      });
    }
  }

  return freeSlots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateFreeTimeSlotsText(slots: FreeTimeSlot[]): string {
  if (slots.length === 0) {
    return '今週は空きがないようです。お忙しいですね！';
  }

  const slotsByDate = new Map<string, FreeTimeSlot[]>();
  for (const slot of slots) {
    if (!slotsByDate.has(slot.date)) {
      slotsByDate.set(slot.date, []);
    }
    slotsByDate.get(slot.date)!.push(slot);
  }

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const lines: string[] = ['【全員の空き時間】'];

  for (const [date, daySlots] of slotsByDate) {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = weekdays[d.getDay()];

    const times = daySlots
      .map(s => `${s.startTime}-${s.endTime}`)
      .join(', ');

    lines.push(`${month}/${day}(${weekday}) ${times}`);
  }

  lines.push('');
  lines.push('ご都合いかがでしょうか？');

  return lines.join('\n');
}

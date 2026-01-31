import type { Env } from './types';
import { handleWebhook } from './handlers/webhook';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Webhook エンドポイント
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, ctx);
    }

    // ヘルスチェック
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // ルート
    if (url.pathname === '/') {
      return new Response('Calendar Line Bot - Free Time Finder', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  },
};

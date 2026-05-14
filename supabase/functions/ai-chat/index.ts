import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AIChatRequest = {
  messages?: ChatMessage[];
  prompt?: string;
  systemInstruction?: string;
  provider?: 'minimax' | 'openai' | 'custom' | string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: 'text' | 'json';
  jsonMode?: boolean;
  timeoutMs?: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json() as AIChatRequest;
    const messages = normalizeMessages(body);
    const provider = (body.provider || Deno.env.get('AI_PROVIDER') || 'minimax').toLowerCase();
    const jsonMode = body.response_format === 'json' || body.jsonMode === true;
    const temperature = clampNumber(body.temperature, 0, 1, 0.8);
    const maxTokens = Math.min(Math.max(Math.floor(body.max_tokens || 8192), 128), 8192);
    const timeoutMs = Math.min(Math.max(Math.floor(body.timeoutMs || 45000), 5000), 120000);

    if (provider === 'minimax') {
      return await callOpenAICompatible({
        provider: 'minimax',
        apiKey: getRequiredEnv(['MINIMAX_API_KEY', 'AI_API_KEY']),
        endpoint: normalizeEndpoint(
          Deno.env.get('MINIMAX_API_ENDPOINT') || 'https://api.minimax.io/v1/text/chatcompletion_v2',
        ),
        model: body.model || Deno.env.get('MINIMAX_MODEL') || 'MiniMax-M1',
        messages,
        temperature,
        maxTokens,
        jsonMode,
        timeoutMs,
      });
    }

    if (provider === 'openai' || provider === 'custom') {
      return await callOpenAICompatible({
        provider,
        apiKey: getRequiredEnv(['OPENAI_API_KEY', 'AI_API_KEY']),
        endpoint: normalizeEndpoint(
          Deno.env.get('OPENAI_API_ENDPOINT') || 'https://api.openai.com/v1/chat/completions',
        ),
        model: body.model || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages,
        temperature,
        maxTokens,
        jsonMode,
        timeoutMs,
      });
    }

    return jsonResponse({ error: `Unsupported AI provider: ${provider}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return jsonResponse({ error: message }, 500);
  }
});

function normalizeMessages(body: AIChatRequest): ChatMessage[] {
  const fromMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = fromMessages
    .filter((message) => message && typeof message.content === 'string')
    .map((message) => ({
      role: ['system', 'assistant', 'user'].includes(message.role) ? message.role : 'user',
      content: limitText(message.content, 12000),
    }));

  if (body.prompt) {
    if (body.systemInstruction) {
      messages.unshift({ role: 'system', content: limitText(body.systemInstruction, 8000) });
    }
    messages.push({ role: 'user', content: limitText(body.prompt, 12000) });
  }

  if (messages.length === 0) {
    throw new Error('Missing messages or prompt');
  }

  const totalLength = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalLength > 32000) {
    throw new Error('Prompt is too long');
  }

  return messages;
}

async function callOpenAICompatible(options: {
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  jsonMode: boolean;
  timeoutMs: number;
}) {
  const messages = options.jsonMode
    ? enforceJsonInstruction(options.messages)
    : options.messages;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('AI request timeout'), options.timeoutMs);

  let upstream: Response;
  try {
    upstream = await fetch(options.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false,
        ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      error: `${options.provider} request failed`,
      detail: message,
      provider: options.provider,
    }, message.toLowerCase().includes('timeout') || message.toLowerCase().includes('abort') ? 504 : 502);
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await upstream.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  const businessError = getBusinessError(payload);
  if (!upstream.ok || businessError) {
    return jsonResponse({
      error: `${options.provider} API error`,
      status: upstream.status,
      detail: sanitizeUpstreamError(businessError || payload),
      provider: options.provider,
      model: options.model,
    }, upstream.status >= 500 ? 502 : 400);
  }

  const content = extractContent(payload);
  if (!content) {
    return jsonResponse({ error: 'AI returned empty content', raw: payload }, 502);
  }

  return jsonResponse({
    content,
    provider: options.provider,
    model: options.model,
    usage: payload?.usage || null,
  });
}

function enforceJsonInstruction(messages: ChatMessage[]): ChatMessage[] {
  const cloned = [...messages];
  const suffix = '\n\n请只返回合法 JSON，不要使用 Markdown 代码块，不要添加解释文字。';
  const lastUserIndex = cloned.map((m) => m.role).lastIndexOf('user');
  if (lastUserIndex >= 0) {
    cloned[lastUserIndex] = {
      ...cloned[lastUserIndex],
      content: `${cloned[lastUserIndex].content}${suffix}`,
    };
  }
  return cloned;
}

function extractContent(payload: any): string {
  return payload?.choices?.[0]?.message?.content
    || payload?.choices?.[0]?.text
    || payload?.choices?.[0]?.messages?.[0]?.text
    || payload?.choices?.[0]?.messages?.[0]?.content
    || payload?.choices?.[0]?.messages?.[0]?.content?.text
    || payload?.reply
    || payload?.content
    || payload?.output_text
    || '';
}

function getBusinessError(payload: any): any {
  const statusCode = payload?.base_resp?.status_code;
  if (typeof statusCode === 'number' && statusCode !== 0) {
    return {
      status_code: statusCode,
      status_msg: payload?.base_resp?.status_msg || 'MiniMax business error',
    };
  }

  return null;
}

function getRequiredEnv(names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  throw new Error(`Missing server AI secret: ${names.join(' or ')}`);
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  if (trimmed.endsWith('/api/v1')) return `${trimmed}/chat/completions`;
  return trimmed;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function limitText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function sanitizeUpstreamError(payload: any): any {
  if (!payload) return null;
  if (typeof payload === 'string') return payload.slice(0, 1000);
  const clone = JSON.parse(JSON.stringify(payload));
  delete clone.api_key;
  delete clone.key;
  delete clone.authorization;
  return clone;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

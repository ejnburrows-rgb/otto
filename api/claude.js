// Vercel serverless route for Ask OTTO AI.
// Uses Vercel AI Gateway through the AI SDK. On Vercel deployments the gateway
// can authenticate with the project OIDC identity, so the CRM does not require
// an Anthropic API key in the browser or project settings.

import { generateText } from 'ai';
import { requireServerAuth } from './_lib/serverAuth.js';

const MODEL_ALIASES = {
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4.6',
  'claude-sonnet-4.6': 'anthropic/claude-sonnet-4.6',
};

function gatewayModel(model) {
  const value = String(model || 'claude-sonnet-4-6');
  if (value.startsWith('anthropic/')) return value;
  return MODEL_ALIASES[value] || 'anthropic/claude-sonnet-4.6';
}

// Only authenticated owner/office accounts may reach the provider.
export default async function handler(req, res) {
  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;
  return claudeHandler(req, res);
}

export async function claudeHandler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    let body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? JSON.parse(raw) : {};
    }

    const result = await generateText({
      model: gatewayModel(body.model),
      system: typeof body.system === 'string' ? body.system : undefined,
      messages: Array.isArray(body.messages) ? body.messages : [],
      maxOutputTokens: Number(body.max_tokens) > 0 ? Number(body.max_tokens) : 600,
    });

    res.status(200).json({
      id: result.response?.id || `otto_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: result.response?.modelId || gatewayModel(body.model),
      content: [{ type: 'text', text: result.text || '' }],
      stop_reason: result.finishReason || 'end_turn',
      usage: {
        input_tokens: result.usage?.inputTokens || 0,
        output_tokens: result.usage?.outputTokens || 0,
      },
    });
  } catch (e) {
    res.status(502).json({ error: 'upstream_error', detail: String(e && e.message || e) });
  }
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

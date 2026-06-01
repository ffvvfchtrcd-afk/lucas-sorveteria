const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatOptions {
  messages: Message[];
  tools?: ToolDefinition[];
  apiKey: string;
}

export async function chatCompletion({ messages, tools, apiKey }: ChatOptions): Promise<{
  message: Message;
  toolCalls: ToolCall[];
}> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    temperature: 0.3,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Dashboard Estoque',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0];
  if (!choice) throw new Error('No response from AI');

  const msg = choice.message;
  return {
    message: {
      role: 'assistant',
      content: msg.content || '',
      tool_calls: msg.tool_calls,
    },
    toolCalls: msg.tool_calls || [],
  };
}

export async function chatCompletionWithRetry(
  opts: ChatOptions,
  maxRetries = 3
): Promise<{ message: Message; toolCalls: ToolCall[] }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await chatCompletion(opts);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}

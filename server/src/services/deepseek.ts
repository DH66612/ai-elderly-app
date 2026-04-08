/**
 * DeepSeek LLM 服务
 * 用于替代 Coze SDK 的 LLM 功能
 */

// 消息类型定义
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

/**
 * 检查 DeepSeek 是否已配置
 */
export function isDeepSeekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

/**
 * 调用 DeepSeek API（非流式）
 */
export async function invokeLLM(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<LLMResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
  }

  const model = options.model || DEFAULT_MODEL;
  
  console.log(`[DeepSeek] 调用模型: ${model}, 消息数: ${messages.length}`);

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DeepSeek] API 错误:', response.status, errorText);
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  const content = data.choices?.[0]?.message?.content || '';
  
  console.log(`[DeepSeek] 响应长度: ${content.length} 字符`);

  return {
    content,
    usage: data.usage,
  };
}

/**
 * 流式调用 DeepSeek API
 * 返回 AsyncGenerator
 */
export async function* streamLLM(
  messages: ChatMessage[],
  options: LLMOptions = {}
): AsyncGenerator<{ content: string; done: boolean }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 环境变量未配置');
  }

  const model = options.model || DEFAULT_MODEL;
  
  console.log(`[DeepSeek] 流式调用模型: ${model}, 消息数: ${messages.length}`);

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      top_p: options.top_p,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DeepSeek] 流式API错误:', response.status, errorText);
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          try {
            const jsonStr = trimmedLine.slice(6);
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content || '';
            
            if (content) {
              yield { content, done: false };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { content: '', done: true };
}

/**
 * DeepSeek LLM 客户端类
 * 提供与原 Coze SDK 类似的接口
 */
export class DeepSeekClient {
  private defaultOptions: LLMOptions;

  constructor(defaultOptions: LLMOptions = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * 非流式调用
   */
  async invoke(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): Promise<LLMResponse> {
    return invokeLLM(messages, { ...this.defaultOptions, ...options });
  }

  /**
   * 流式调用
   */
  async *stream(
    messages: ChatMessage[],
    options: LLMOptions = {}
  ): AsyncGenerator<{ content: string }> {
    const generator = streamLLM(messages, { ...this.defaultOptions, ...options });
    for await (const chunk of generator) {
      if (chunk.content) {
        yield { content: chunk.content };
      }
    }
  }
}

// 导出默认客户端实例
export const deepseekClient = new DeepSeekClient();

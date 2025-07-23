
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class ChatService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async trySendWithKey(request: ChatRequest, apiKey: string): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Vivica Chat Companion'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response;
    } catch (error) {
      console.warn(`Attempt with key ${apiKey?.slice(-4)} failed:`, error);
      throw error;
    }
  }

  async sendMessage(request: ChatRequest): Promise<Response> {
    console.log('Sending request to OpenRouter:', {
      url: `${this.baseUrl}/chat/completions`,
      request: request
    });

    // Get all API keys from storage - constructor key first, then settings keys
    const settings = JSON.parse(localStorage.getItem('vivica-settings') || '{}');
    const keys = [
      this.apiKey,                   // Primary key from constructor
      settings.apiKey1 || '',        // Secondary key from settings  
      settings.apiKey2 || '',        // Tertiary key from settings
      settings.apiKey3 || ''         // Additional fallback key
    ].filter(key => key?.trim());    // Filter out empty keys

    if (keys.length === 0) {
      throw new Error('No valid API keys configured. Please check your settings.');
    }

    let lastError: Error | null = null;
    
    // Try each key in order until one succeeds
    for (const [index, key] of keys.entries()) {
      try {
        const response = await this.trySendWithKey(request, key);
        
        // If we're not using the primary key, log which fallback worked
        if (index > 0) {
          console.log(`Request succeeded with fallback key ${index + 1}`);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        // Continue to next key unless it's the last attempt
        if (index === keys.length - 1) break;
      }
    }

    // All attempts failed - format a helpful error message
    const errorMsg = lastError?.message.includes('401') 
      ? 'Invalid API key(s). Please check your settings.'
      : lastError?.message.includes('rate limit')
      ? 'Rate limits exceeded on all keys. Please upgrade your plan or try again later.'
      : 'All API key attempts failed. Please check your connection and keys.';
    
    console.error('OpenRouter API failed after all attempts:', errorMsg);
    throw new Error(errorMsg);
  }

  async *streamResponse(response: Response): AsyncGenerator<string, void, unknown> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              console.warn('Failed to parse streaming response:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

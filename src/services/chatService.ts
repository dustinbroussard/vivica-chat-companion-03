
import { toast } from "@/components/ui/sonner";
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
  isCodeRequest?: boolean; // Flag for code requests
  profile?: {  // Include full profile for model routing
    model: string;
    codeModel: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface StreamStart {
  type: 'stream_start';
  data: { isCodeRequest?: boolean };
}

export interface StreamContent {
  content: string;
  isCodeRequest?: boolean;
}

export class ChatService {
  /** Primary key used for OpenRouter requests */
  // TODO: allow setting multiple keys here instead of pulling from localStorage
  private apiKey: string;
  // apiKeyList is unused; keep until multi-key refactor
  private apiKeyList: string[];
  private baseUrl = 'https://openrouter.ai/api/v1';
  private telemetry = {
    keyUsage: {} as Record<string, {success: number, failures: number}>,
    lastUsedKey: '',
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.initKeyTelemetry();
  }

  private initKeyTelemetry() {
    const saved = localStorage.getItem('vivica-key-telemetry');
    if (saved) {
      try {
        this.telemetry = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to load key telemetry', e);
      }
    }
  }

  private saveKeyTelemetry() {
    localStorage.setItem(
      'vivica-key-telemetry', 
      JSON.stringify(this.telemetry)
    );
  }

  private trackKeyUsage(key: string, success: boolean) {
    const shortKey = key.slice(-4);
    if (!this.telemetry.keyUsage[shortKey]) {
      this.telemetry.keyUsage[shortKey] = {success: 0, failures: 0};
    }
    
    if (success) {
      this.telemetry.keyUsage[shortKey].success++;
      this.telemetry.lastUsedKey = shortKey;
    } else {
      this.telemetry.keyUsage[shortKey].failures++;
    }
    
    this.saveKeyTelemetry();
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

  private isCodeRequest(messages: ChatMessage[]): boolean {
    // Check if last message contains code-related keywords or backticks
    const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || '';
    return lastMessage.includes('code') || 
           lastMessage.includes('function') ||
           lastMessage.includes('```') ||
           lastMessage.includes('programming');
  }

  async sendMessage(request: ChatRequest): Promise<Response> {
    // Route to code model if this is a code request
    const isCode = request.isCodeRequest ?? this.isCodeRequest(request.messages);
    const effectiveModel = isCode && request.profile?.codeModel 
      ? request.profile.codeModel 
      : request.model;

    console.log('Sending request to OpenRouter:', {
      url: `${this.baseUrl}/chat/completions`,
      request: {
        ...request,
        model: effectiveModel,
        isCodeRequest: isCode
      }
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

    // Only show visual feedback if we have multiple keys to try
    const showRetryFeedback = keys.length > 1;
    
    // Try each key in order until one succeeds
    for (const [index, key] of keys.entries()) {
      try {
        if (index > 0 && showRetryFeedback) {
          toast.message(`Connecting with backup key ${index + 1}...`, {
            duration: 1000,
            position: 'bottom-center'
          });
          // Add slight delay between retries
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        const response = await this.trySendWithKey(request, key);
        this.trackKeyUsage(key, true);
        
        if (index > 0 && showRetryFeedback) {
          toast.success(`Connected with backup key`, {
            duration: 2000,
            position: 'bottom-center'
          });
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


  async *streamResponse(
    response: Response,
    request?: ChatRequest
  ): AsyncGenerator<string | StreamStart | StreamContent, void, unknown> {
    // Yield a signal before starting the stream
    const startSignal: StreamStart = {
      type: 'stream_start',
      data: { isCodeRequest: request?.isCodeRequest }
    };
    yield startSignal;
    
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
                // If this was a code request, we'll need to send the result to Vivica for summary
                // TODO: route the final code output back through the persona model
                // for a plain-English explanation before displaying to the user.
                yield {
                  content,
                  isCodeRequest: request?.isCodeRequest
                };
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

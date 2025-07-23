import { MemoryStorage } from "@/js/voice-mode";
import { toast } from "sonner";

/**
 * Saves a summarized memory from conversation history
 * @param messages Array of chat messages
 * @param model Current LLM model name 
 * @param apiKey OpenRouter API key
 * @returns Promise resolving when memory is saved
 */
export async function saveConversationMemory(messages: ChatMessage[], model: string, apiKey: string) {
  // Build prompt focusing on concise summary and key facts
  const prompt = `
  As Vivica, summarize this conversation in 1-2 sentences while maintaining my helpful tone.
  Also extract 2-5 key facts, decisions, or names worth remembering.
  Respond in this format exactly:
  
  Summary: [concise summary here]
  Key Points:
  - [point 1]
  - [point 2]
  - [...]

  Conversation:
  ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are Vivica, summarizing conversations concisely.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3 // Lower temp for more factual summaries
      })
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (summary) {
      await MemoryStorage.addMemory({
        id: Date.now().toString(),
        content: summary,
        createdAt: new Date().toISOString(),
        tags: ['auto-summary']
      });
      toast.success("Conversation saved to memory!");
    } else {
      throw new Error('No summary generated');
    }
  } catch (error) {
    console.error('Failed to save memory:', error);
    toast.error("Failed to save summary");
    throw error;
  }
}

import { MemoryStorage } from "@/js/voice-mode";
import { ChatMessage } from "@/services/chatService";
import { toast } from "sonner";

/**
 * Saves a summarized memory from conversation history
 * @param messages Array of chat messages
 * @param model Current LLM model name 
 * @param apiKey OpenRouter API key
 * @returns Promise resolving when memory is saved
 */
/**
 * Saves a conversation summary to memory storage
 * @param messages - Array of chat messages to summarize
 * @param model - Model name to use for summarization
 * @param apiKey - API key for LLM calls
 * @returns Promise with the saved memory data
 */
export async function saveConversationMemory(messages: ChatMessage[], model: string, apiKey: string): Promise<{id: string, content: string}> {
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
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      throw new Error('No summary generated');
    }

    // Clean up the response if it has bullet points
    const cleanedSummary = summary
      .replace(/^- /mg, '• ') // Convert hyphens to bullets
      .replace(/\n\s*\n/g, '\n\n'); // Normalize spacing

    const memoryData = {
      id: `memory-${Date.now()}`,
      content: cleanedSummary,
      createdAt: new Date().toISOString(),
      tags: ['auto-summary']
    };

    await MemoryStorage.addMemory(memoryData);
    toast.success("Conversation saved to memory!");
    return memoryData;
  } catch (error) {
    console.error('Failed to save memory:', error);
    toast.error("Failed to save summary");
    throw error;
  }
}

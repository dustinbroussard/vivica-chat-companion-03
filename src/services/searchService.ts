// Brave Search API service
export interface BraveResult {
  title: string;
  description: string;
  url: string;
}

export interface BraveSearchResponse {
  web: { results: BraveResult[] };
}

export async function searchBrave(query: string, apiKey: string): Promise<BraveResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  // TODO: support multiple Brave keys with retry logic similar to ChatService
  const resp = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': apiKey,
    }
  });

  if (!resp.ok) {
    throw new Error(`Brave Search error: ${resp.status}`);
  }

  const data: BraveSearchResponse = await resp.json();
  return data.web?.results || [];
}

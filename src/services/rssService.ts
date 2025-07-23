export interface Headline {
  title: string;
  link: string;
  source?: string;
}

const DEFAULT_FEED = 'https://rss.cnn.com/rss/cnn_us.rss';

export async function fetchRSSHeadlines(): Promise<Headline[]> {
  const parser = new DOMParser();
  const headlines: Headline[] = [];

  const settings = JSON.parse(localStorage.getItem('vivica-settings') || '{}');
  const feeds: string[] = settings.rssFeeds
    ? settings.rssFeeds.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [DEFAULT_FEED];

  for (const url of feeds) {
    try {
      const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      const data = await resp.text();
      if (!data) continue;

      const doc = parser.parseFromString(data, 'text/xml');
      const items = doc.querySelectorAll('item');
      const domain = new URL(url).hostname.replace('www.', '');

      for (const item of items) {
        const title = item.querySelector('title')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();
        if (title && link) {
          headlines.push({ title, link, source: domain });
        }
      }
    } catch (err) {
      console.debug('Failed to fetch RSS feed:', url, err);
      continue;
    }
  }

  return headlines.slice(0, 10);
}

export async function fetchArticleText(url: string): Promise<string> {
  const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
  const html = await resp.text();
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

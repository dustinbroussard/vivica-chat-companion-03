import { useEffect, useState, useRef } from 'react';
import { Storage } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ExternalLink } from 'lucide-react';

interface Headline {
  title: string;
  link: string;
  source?: string;
}

const DEFAULT_FEED = 'https://rss.cnn.com/rss/cnn_us.rss';

async function fetchRSSSummariesWithLinks(urls: string[]): Promise<Headline[]> {
  const parser = new DOMParser();
  const headlines: Headline[] = [];
  
  for (const url of urls) {
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
          headlines.push({ 
            title, 
            link,
            source: domain
          });
        }
      }
    } catch (err) {
      console.debug('Failed to fetch RSS feed:', url, err);
      continue;
    }
  }
  return headlines.slice(0, 20); // Limit to 20 headlines
}

interface RSSWidgetProps {
  onSendMessage: (content: string) => void;
  onNewChat: () => void;
}

export const RSSWidget = ({ onSendMessage, onNewChat }: RSSWidgetProps) => {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [currentHeadline, setCurrentHeadline] = useState<Headline | null>(null);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const loadRSSFeeds = async () => {
      setLoading(true);
      setError('');
      const settings = Storage.get('vivica-settings', { rssFeeds: '' });

      const feeds = settings.rssFeeds
        ? settings.rssFeeds.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [DEFAULT_FEED];
      
      try {
        const fetchedHeadlines = await fetchRSSSummariesWithLinks(feeds);
        setHeadlines(fetchedHeadlines);
        
        if (fetchedHeadlines.length > 0) {
          setCurrentHeadline(fetchedHeadlines[0]);
        } else {
          setError('No headlines found');
        }
      } catch (err) {
        console.error('Failed to load RSS feeds:', err);
        setError('Failed to load news feed');
      } finally {
        setLoading(false);
      }
    };

    loadRSSFeeds();
  }, []);

  useEffect(() => {
    if (headlines.length <= 1) return;

    const interval = setInterval(() => {
      setOpacity(0);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % headlines.length);
        setCurrentHeadline(headlines[(currentIndex + 1) % headlines.length]);
        setOpacity(1);
      }, 350);
    }, 5000);

    return () => clearInterval(interval);
  }, [headlines, currentIndex]);

  if (loading) {
    return (
      <div className="p-4 rounded-lg bg-card/50 border border-border flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading news...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-card/50 border border-border text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!currentHeadline) {
    return null;
  }

  const handleHeadlineClick = async () => {
    if (!currentHeadline.link.startsWith('http')) {
      toast.warning('Invalid news link');
      return;
    }

    try {
      const resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(currentHeadline.link)}`);
      const html = await resp.text();
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const messageContent = `Summarize the following news article in detail and be ready to discuss it.\nSource: ${currentHeadline.source} – ${currentHeadline.title}\n\n${text}`;
      onNewChat();
      onSendMessage(messageContent);
    } catch (err) {
      console.error('Failed to fetch article', err);
      toast.error('Failed to load article');
    }
  };

  return (
    <div className="group relative p-4 rounded-lg bg-card/50 border border-border hover:border-accent/30 transition-colors">
      <div className="text-sm transition-opacity duration-300" style={{ opacity }}>
        <Button
          variant="ghost"
          className="w-full h-auto p-0 text-foreground hover:text-accent justify-start gap-2"
          onClick={handleHeadlineClick}
        >
          <span className="shrink-0">📰</span>
          <span className="truncate text-left">{currentHeadline.title}</span>
          {currentHeadline.link.startsWith('http') && (
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-70 ml-auto" />
          )}
        </Button>
      </div>
    </div>
  );
};

import { Share } from '@capacitor/share';
import { IS_NATIVE_APP } from '@/lib/platform';

interface ShareContent {
  title: string;
  text: string;
  url: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled';

const copyShareContent = async ({ text, url }: ShareContent): Promise<ShareResult> => {
  await navigator.clipboard.writeText(`${text} ${url}`.trim());
  return 'copied';
};

/** Uses the system share sheet in native apps and supported browsers, with clipboard fallback. */
export const shareContent = async (content: ShareContent): Promise<ShareResult> => {
  try {
    if (IS_NATIVE_APP) {
      await Share.share(content);
      return 'shared';
    }

    if (navigator.share) {
      await navigator.share(content);
      return 'shared';
    }

    return await copyShareContent(content);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';

    try {
      return await copyShareContent(content);
    } catch {
      return 'cancelled';
    }
  }
};
import type {MetadataRoute} from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://tasky.ge';
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/ka`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/en`, changeFrequency: 'weekly', priority: 0.9 },
  ];
}

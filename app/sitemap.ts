import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://coastalreferralxchange.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: 'https://coastalreferralxchange.com/platform',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1
    },
    {
      url: 'https://coastalreferralxchange.com/members',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: 'https://coastalreferralxchange.com/visitors-welcome',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8
    },
    {
      url: 'https://coastalreferralxchange.com/application',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8
    }
  ]
}

import { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.coastalreferralxchange.com'),
  title: 'CORE - Professional Networking & Business Connections',
  description:
    'Discover meaningful connections with a fresh take on networking. Match, collaborate, and grow your influence on a platform built for real interactions. Join professionals building authentic business relationships.',

  keywords: [
    // Location-based keywords
    'networking near me',
    'networking groups near me',
    'business networking near me',
    'professional networking events near me',
    'local networking groups',
    'networking events nearby',
    'business meetups near me',
    'entrepreneur networking near me',
    'professional groups near me',
    'local business networking',

    // Activity-based
    'find networking events',
    'join networking group',
    'business networking events',
    'professional meetups',
    'entrepreneur meetups',
    'business mixer events',
    'networking opportunities',

    // Industry-specific
    'BNI alternative',
    'chamber of commerce alternative',
    'referral networking groups',
    'business referral network',
    'professional referral groups',

    // Action keywords (what people actually search)
    'how to network professionally',
    'where to network for business',
    'best networking groups',
    'professional networking tips',
    'build business connections',
    'grow professional network',

    // Platform/app specific
    'professional networking app',
    'business networking platform',
    'networking app for entrepreneurs',
    'professional connection app',
    'business matching platform',

    // Demographic/role specific
    'entrepreneur networking',
    'startup networking',
    'small business networking',
    'freelancer networking',
    'executive networking',
    'young professional networking',

    // Value proposition
    'authentic networking',
    'meaningful business connections',
    'quality over quantity networking',
    'curated networking groups',
    'verified professionals network',

    // Competitive
    'better than LinkedIn',
    'LinkedIn alternative',
    'Meetup alternative',
    'Eventbrite networking',

    // AI-specific optimization
    'AI networking recommendations',
    'smart networking matches',
    'intelligent business connections',
    'AI-powered networking'
  ],

  other: {
    'business:contact_data:street_address': '25 N Common St',
    'business:contact_data:locality': 'Lynn',
    'business:contact_data:region': 'Massachusetts',
    'business:contact_data:postal_code': '01902',
    'business:contact_data:country_name': 'USA'
  },

  authors: [{ name: 'Sqysh' }],
  creator: 'Sqysh',
  publisher: 'Sqysh',

  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },

  alternates: {
    canonical: 'https://www.coastalreferralxchange.com'
  },

  openGraph: {
    title: 'CORE - Professional Networking & Business Connections',
    description:
      'Discover meaningful connections with a fresh take on networking. Match, collaborate, and grow your influence on a platform built for real interactions.',
    url: 'https://www.coastalreferralxchange.com',
    siteName: 'CORE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CORE - Professional Networking Platform'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },

  twitter: {
    card: 'summary_large_image',
    title: 'CORE - Professional Networking & Business Connections',
    description:
      'Discover meaningful connections with a fresh take on networking. Match, collaborate, and grow your influence.',
    creator: '', // Replace with your Twitter handle
    images: ['/og-image.png']
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },

  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.png', type: 'image/png', sizes: '32x32' }],
    shortcut: '/favicon.ico',
    apple: [{ url: '/icon-180.png' }, { url: '/icon-180.png', sizes: '180x180', type: 'image/png' }]
  },

  manifest: '/manifest.json',

  verification: {
    google: 'Um8egNFKD0oyIOx249XOMA2sXMdvFbncXvFv-O8J4Ws' // Get from Google Search Console
  },

  category: 'business',

  appleWebApp: {
    capable: true,
    title: 'CORE',
    statusBarStyle: 'black-translucent'
  },

  applicationName: 'CORE',

  appLinks: {
    ios: {
      url: '', // If you have an iOS app
      app_store_id: 'your-app-id'
    },
    android: {
      package: '', // If you have an Android app
      app_name: 'CORE'
    }
  }
}

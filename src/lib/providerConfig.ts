import { Provider } from '../types';

export const providerConfig: Provider[] = [
  // Social Media Platforms
  {
    name: "Instagram",
    key: "instagram",
    icon: "/icons/instagram.svg",
    authType: "oauth",
    providerId: "instagram",
    docsUrl: "https://developers.facebook.com/docs/instagram-basic-display-api/",
    category: "Social Media Platforms"
  },
  {
    name: "YouTube",
    key: "youtube",
    icon: "/icons/youtube.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    docsUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    category: "Social Media Platforms"
  },
  {
    name: "TikTok",
    key: "tiktok",
    icon: "/icons/tiktok.svg",
    authType: "oauth",
    providerId: "tiktok",
    docsUrl: "https://developers.tiktok.com/doc/login-kit-web",
    category: "Social Media Platforms"
  },
  {
    name: "LinkedIn",
    key: "linkedin",
    icon: "/icons/linkedin.svg",
    authType: "oauth",
    providerId: "linkedin",
    scopes: ["r_liteprofile", "r_emailaddress"],
    docsUrl: "https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow",
    category: "Social Media Platforms"
  },
  {
    name: "Twitter/X",
    key: "twitter",
    icon: "/icons/twitter.svg",
    authType: "oauth",
    providerId: "twitter",
    docsUrl: "https://developer.twitter.com/en/docs/authentication/oauth-1-0a",
    category: "Social Media Platforms"
  },
  {
    name: "Pinterest",
    key: "pinterest",
    icon: "/icons/pinterest.svg",
    authType: "oauth",
    providerId: "pinterest",
    docsUrl: "https://developers.pinterest.com/docs/getting-started/authentication/",
    category: "Social Media Platforms"
  },
  {
    name: "Snapchat",
    key: "snapchat",
    icon: "/icons/snapchat.svg",
    authType: "oauth",
    providerId: "snapchat",
    docsUrl: "https://developers.snap.com/api/docs/",
    category: "Social Media Platforms"
  },
  {
    name: "Facebook/Meta",
    key: "facebook",
    icon: "/icons/facebook.svg",
    authType: "oauth",
    providerId: "facebook",
    docsUrl: "https://developers.facebook.com/docs/facebook-login/",
    category: "Social Media Platforms"
  },

  // AI & Content Generation
  {
    name: "OpenAI (ChatGPT)",
    key: "openai",
    icon: "/icons/openai.svg",
    authType: "manual",
    docsUrl: "https://platform.openai.com/docs/quickstart",
    fallbackInstructions: "1. Log in to OpenAI Platform\n2. Go to API Keys section\n3. Create a new secret key\n4. Copy and paste it below",
    category: "AI & Content Generation"
  },
  {
    name: "Anthropic (Claude)",
    key: "anthropic",
    icon: "/icons/anthropic.svg",
    authType: "manual",
    docsUrl: "https://docs.anthropic.com/claude/reference/getting-started",
    fallbackInstructions: "1. Sign up for Anthropic Console\n2. Navigate to API Keys\n3. Generate a new API key\n4. Enter the key below",
    category: "AI & Content Generation"
  },
  {
    name: "Google Gemini",
    key: "gemini",
    icon: "/icons/gemini.svg",
    authType: "manual",
    docsUrl: "https://ai.google.dev/docs",
    fallbackInstructions: "1. Go to Google AI Studio\n2. Create API key\n3. Copy the generated key\n4. Paste it below",
    category: "AI & Content Generation"
  },
  {
    name: "xAI (Grok)",
    key: "xai",
    icon: "/icons/xai.svg",
    authType: "manual",
    docsUrl: "https://docs.x.ai/",
    fallbackInstructions: "1. Access xAI Console\n2. Generate API credentials\n3. Copy your API key\n4. Enter it below",
    category: "AI & Content Generation"
  },
  {
    name: "Copy.ai",
    key: "copyai",
    icon: "/icons/copyai.svg",
    authType: "manual",
    docsUrl: "https://www.copy.ai/help/en/articles/6265094-copy-ai-api",
    fallbackInstructions: "1. Log into Copy.ai\n2. Go to API settings\n3. Generate new API key\n4. Copy and paste below",
    category: "AI & Content Generation"
  },
  {
    name: "Jasper.ai",
    key: "jasper",
    icon: "/icons/jasper.svg",
    authType: "manual",
    docsUrl: "https://developers.jasper.ai/",
    fallbackInstructions: "1. Access Jasper dashboard\n2. Navigate to API section\n3. Create new API key\n4. Enter the key below",
    category: "AI & Content Generation"
  },
  {
    name: "Notion AI",
    key: "notion-ai",
    icon: "/icons/notion.svg",
    authType: "oauth",
    providerId: "notion",
    docsUrl: "https://developers.notion.com/docs/authorization",
    category: "AI & Content Generation"
  },

  // Payments & Payouts
  {
    name: "Stripe",
    key: "stripe",
    icon: "/icons/stripe.svg",
    authType: "oauth",
    providerId: "stripe",
    scopes: ["read_write"],
    docsUrl: "https://stripe.com/docs/connect",
    category: "Payments & Payouts"
  },
  {
    name: "PayPal",
    key: "paypal",
    icon: "/icons/paypal.svg",
    authType: "oauth",
    providerId: "paypal",
    docsUrl: "https://developer.paypal.com/docs/api/overview/",
    category: "Payments & Payouts"
  },

  // Website Builders / E-Commerce
  {
    name: "Shopify",
    key: "shopify",
    icon: "/icons/shopify.svg",
    authType: "oauth",
    providerId: "shopify",
    docsUrl: "https://shopify.dev/docs/apps/auth/oauth",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "WooCommerce",
    key: "woocommerce",
    icon: "/icons/woocommerce.svg",
    authType: "manual",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    fallbackInstructions: "1. Go to WooCommerce > Settings > Advanced > REST API\n2. Create new API key\n3. Copy Consumer Key and Secret\n4. Enter both below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Amazon Influencer Store",
    key: "amazon-influencer",
    icon: "/icons/amazon.svg",
    authType: "manual",
    docsUrl: "https://advertising.amazon.com/API/docs/en-us/get-started/developer-notes",
    fallbackInstructions: "1. Access Amazon Advertising Console\n2. Generate API credentials\n3. Copy access keys\n4. Enter credentials below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Wix",
    key: "wix",
    icon: "/icons/wix.svg",
    authType: "oauth",
    providerId: "wix",
    docsUrl: "https://dev.wix.com/api/rest/getting-started/authentication",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "BigCommerce",
    key: "bigcommerce",
    icon: "/icons/bigcommerce.svg",
    authType: "oauth",
    providerId: "bigcommerce",
    docsUrl: "https://developer.bigcommerce.com/docs/start/authentication/api-accounts",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Squarespace",
    key: "squarespace",
    icon: "/icons/squarespace.svg",
    authType: "manual",
    docsUrl: "https://developers.squarespace.com/",
    fallbackInstructions: "1. Access Squarespace developer tools\n2. Generate API key\n3. Copy the key\n4. Paste it below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Etsy",
    key: "etsy",
    icon: "/icons/etsy.svg",
    authType: "oauth",
    providerId: "etsy",
    docsUrl: "https://developers.etsy.com/documentation/essentials/authentication",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Linktree",
    key: "linktree",
    icon: "/icons/linktree.svg",
    authType: "manual",
    docsUrl: "https://linktr.ee/help/linktree-api",
    fallbackInstructions: "1. Go to Linktree Admin\n2. Access API settings\n3. Generate access token\n4. Copy and paste below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Ko-fi",
    key: "kofi",
    icon: "/icons/kofi.svg",
    authType: "manual",
    docsUrl: "https://ko-fi.com/manage/webhooks",
    fallbackInstructions: "1. Go to Ko-fi settings\n2. Find API/Webhook section\n3. Generate verification token\n4. Enter token below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Gumroad",
    key: "gumroad",
    icon: "/icons/gumroad.svg",
    authType: "manual",
    docsUrl: "https://help.gumroad.com/article/280-gumroads-api",
    fallbackInstructions: "1. Log into Gumroad\n2. Go to Settings > Advanced\n3. Generate API key\n4. Copy and paste below",
    category: "Website Builders / E-Commerce"
  },
  {
    name: "Stan Store",
    key: "stanstore",
    icon: "/icons/stanstore.svg",
    authType: "manual",
    docsUrl: "https://stan.store/help",
    fallbackInstructions: "1. Access Stan Store dashboard\n2. Go to integrations\n3. Generate API credentials\n4. Enter them below",
    category: "Website Builders / E-Commerce"
  },

  // Analytics & Conversion
  {
    name: "Google Analytics",
    key: "google-analytics",
    icon: "/icons/google-analytics.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/core/v4/authorization",
    category: "Analytics & Conversion"
  },
  {
    name: "Meta Business Suite",
    key: "meta-business",
    icon: "/icons/meta-business.svg",
    authType: "oauth",
    providerId: "facebook",
    scopes: ["business_management", "ads_read"],
    docsUrl: "https://developers.facebook.com/docs/marketing-api/",
    category: "Analytics & Conversion"
  },
  {
    name: "Google Ads",
    key: "google-ads",
    icon: "/icons/google-ads.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/adwords"],
    docsUrl: "https://developers.google.com/google-ads/api/docs/oauth/overview",
    category: "Analytics & Conversion"
  },
  {
    name: "TikTok Ads Manager",
    key: "tiktok-ads",
    icon: "/icons/tiktok-ads.svg",
    authType: "oauth",
    providerId: "tiktok-ads",
    docsUrl: "https://ads.tiktok.com/marketing_api/docs?id=1738373164380162",
    category: "Analytics & Conversion"
  },
  {
    name: "YouTube Studio",
    key: "youtube-studio",
    icon: "/icons/youtube-studio.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/youtube"],
    docsUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    category: "Analytics & Conversion"
  },
  {
    name: "Microsoft Clarity",
    key: "clarity",
    icon: "/icons/clarity.svg",
    authType: "manual",
    docsUrl: "https://docs.microsoft.com/en-us/clarity/",
    fallbackInstructions: "1. Go to Microsoft Clarity\n2. Access project settings\n3. Copy tracking ID\n4. Enter ID below",
    category: "Analytics & Conversion"
  },

  // Marketing & CRM
  {
    name: "Mailchimp",
    key: "mailchimp",
    icon: "/icons/mailchimp.svg",
    authType: "oauth",
    providerId: "mailchimp",
    docsUrl: "https://mailchimp.com/developer/marketing/guides/access-user-data-oauth-2/",
    category: "Marketing & CRM"
  },
  {
    name: "ConvertKit",
    key: "convertkit",
    icon: "/icons/convertkit.svg",
    authType: "manual",
    docsUrl: "https://developers.convertkit.com/",
    fallbackInstructions: "1. Log into ConvertKit\n2. Go to Settings > Advanced\n3. Copy API Key and Secret\n4. Enter both below",
    category: "Marketing & CRM"
  },
  {
    name: "FloDesk",
    key: "flodesk",
    icon: "/icons/flodesk.svg",
    authType: "manual",
    docsUrl: "https://developers.flodesk.com/",
    fallbackInstructions: "1. Access Flodesk account\n2. Go to integrations\n3. Generate API key\n4. Copy and paste below",
    category: "Marketing & CRM"
  },
  {
    name: "ActiveCampaign",
    key: "activecampaign",
    icon: "/icons/activecampaign.svg",
    authType: "manual",
    docsUrl: "https://developers.activecampaign.com/",
    fallbackInstructions: "1. Log into ActiveCampaign\n2. Go to Settings > Developer\n3. Copy API URL and Key\n4. Enter both below",
    category: "Marketing & CRM"
  },
  {
    name: "Klaviyo",
    key: "klaviyo",
    icon: "/icons/klaviyo.svg",
    authType: "oauth",
    providerId: "klaviyo",
    docsUrl: "https://developers.klaviyo.com/en/docs/getting_started",
    category: "Marketing & CRM"
  },
  {
    name: "HubSpot",
    key: "hubspot",
    icon: "/icons/hubspot.svg",
    authType: "oauth",
    providerId: "hubspot",
    docsUrl: "https://developers.hubspot.com/docs/api/oauth-quickstart-guide",
    category: "Marketing & CRM"
  },
  {
    name: "Salesforce",
    key: "salesforce",
    icon: "/icons/salesforce.svg",
    authType: "oauth",
    providerId: "salesforce",
    docsUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_understanding_authentication.htm",
    category: "Marketing & CRM"
  },
  {
    name: "Zapier",
    key: "zapier",
    icon: "/icons/zapier.svg",
    authType: "manual",
    docsUrl: "https://platform.zapier.com/docs/auth",
    fallbackInstructions: "1. Go to Zapier Platform\n2. Create new app\n3. Generate API key\n4. Copy and paste below",
    category: "Marketing & CRM"
  },
  {
    name: "Airtable",
    key: "airtable",
    icon: "/icons/airtable.svg",
    authType: "oauth",
    providerId: "airtable",
    docsUrl: "https://airtable.com/developers/web/api/oauth-reference",
    category: "Marketing & CRM"
  },
  {
    name: "Notion",
    key: "notion",
    icon: "/icons/notion.svg",
    authType: "oauth",
    providerId: "notion",
    docsUrl: "https://developers.notion.com/docs/authorization",
    category: "Marketing & CRM"
  },

  // Scheduling & Collaboration
  {
    name: "Hootsuite",
    key: "hootsuite",
    icon: "/icons/hootsuite.svg",
    authType: "oauth",
    providerId: "hootsuite",
    docsUrl: "https://developer.hootsuite.com/docs/authentication",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Buffer",
    key: "buffer",
    icon: "/icons/buffer.svg",
    authType: "oauth",
    providerId: "buffer",
    docsUrl: "https://buffer.com/developers/api/oauth",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Later",
    key: "later",
    icon: "/icons/later.svg",
    authType: "manual",
    docsUrl: "https://developers.later.com/",
    fallbackInstructions: "1. Log into Later\n2. Go to Settings > API\n3. Generate access token\n4. Copy and paste below",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Slack",
    key: "slack",
    icon: "/icons/slack.svg",
    authType: "oauth",
    providerId: "slack",
    docsUrl: "https://api.slack.com/authentication/oauth-v2",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Microsoft Teams",
    key: "teams",
    icon: "/icons/teams.svg",
    authType: "oauth",
    providerId: "microsoft",
    docsUrl: "https://docs.microsoft.com/en-us/graph/auth/",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Calendly",
    key: "calendly",
    icon: "/icons/calendly.svg",
    authType: "oauth",
    providerId: "calendly",
    docsUrl: "https://developer.calendly.com/api-docs/",
    category: "Scheduling & Collaboration"
  },

  // Email Providers
  {
    name: "Gmail",
    key: "gmail",
    icon: "/icons/gmail.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    docsUrl: "https://developers.google.com/gmail/api/auth/web-server",
    category: "Email Providers"
  },
  {
    name: "Outlook / Microsoft 365",
    key: "outlook",
    icon: "/icons/outlook.svg",
    authType: "oauth",
    providerId: "microsoft",
    scopes: ["https://graph.microsoft.com/mail.read"],
    docsUrl: "https://docs.microsoft.com/en-us/graph/auth/",
    category: "Email Providers"
  },
  {
    name: "Yahoo Mail",
    key: "yahoo",
    icon: "/icons/yahoo.svg",
    authType: "oauth",
    providerId: "yahoo",
    docsUrl: "https://developer.yahoo.com/oauth2/guide/",
    category: "Email Providers"
  },
  {
    name: "iCloud Mail",
    key: "icloud",
    icon: "/icons/icloud.svg",
    authType: "manual",
    docsUrl: "https://support.apple.com/en-us/HT204397",
    fallbackInstructions: "1. Go to Apple ID settings\n2. Generate app-specific password\n3. Use IMAP settings:\n   Server: imap.mail.me.com\n   Port: 993\n4. Enter credentials below",
    category: "Email Providers"
  },
  {
    name: "Zoho Mail",
    key: "zoho",
    icon: "/icons/zoho.svg",
    authType: "oauth",
    providerId: "zoho",
    docsUrl: "https://www.zoho.com/mail/help/api/oauth-overview.html",
    category: "Email Providers"
  },

  // Cloud Storage & File Management
  {
    name: "Google Drive",
    key: "google-drive",
    icon: "/icons/google-drive.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    docsUrl: "https://developers.google.com/drive/api/guides/about-auth",
    category: "Cloud Storage & File Management"
  },
  {
    name: "Dropbox",
    key: "dropbox",
    icon: "/icons/dropbox.svg",
    authType: "oauth",
    providerId: "dropbox",
    docsUrl: "https://developers.dropbox.com/oauth-guide",
    category: "Cloud Storage & File Management"
  },
  {
    name: "OneDrive",
    key: "onedrive",
    icon: "/icons/onedrive.svg",
    authType: "oauth",
    providerId: "microsoft",
    scopes: ["https://graph.microsoft.com/files.read"],
    docsUrl: "https://docs.microsoft.com/en-us/onedrive/developer/",
    category: "Cloud Storage & File Management"
  },
  {
    name: "Box",
    key: "box",
    icon: "/icons/box.svg",
    authType: "oauth",
    providerId: "box",
    docsUrl: "https://developer.box.com/guides/authentication/oauth2/",
    category: "Cloud Storage & File Management"
  },
  {
    name: "iCloud Drive",
    key: "icloud-drive",
    icon: "/icons/icloud-drive.svg",
    authType: "manual",
    docsUrl: "https://developer.apple.com/documentation/cloudkit",
    fallbackInstructions: "1. Set up CloudKit\n2. Get container identifier\n3. Generate API token\n4. Enter credentials below",
    category: "Cloud Storage & File Management"
  },

  // Additional integrations for Action Kit
  {
    name: "Asana",
    key: "asana",
    icon: "/icons/asana.svg",
    authType: "oauth",
    providerId: "asana",
    docsUrl: "https://developers.asana.com/docs/oauth",
    category: "Project Management"
  },
  {
    name: "GitHub",
    key: "github",
    icon: "/icons/github.svg",
    authType: "oauth",
    providerId: "github",
    docsUrl: "https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps",
    category: "Development Tools"
  },
  {
    name: "Google Calendar",
    key: "google-calendar",
    icon: "/icons/google-calendar.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/calendar"],
    docsUrl: "https://developers.google.com/calendar/api/guides/auth",
    category: "Scheduling & Collaboration"
  },
  {
    name: "Google Sheets",
    key: "google-sheets",
    icon: "/icons/google-sheets.svg",
    authType: "oauth",
    providerId: "google",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    docsUrl: "https://developers.google.com/sheets/api/guides/authorizing",
    category: "Productivity"
  },
  {
    name: "Intercom",
    key: "intercom",
    icon: "/icons/intercom.svg",
    authType: "oauth",
    providerId: "intercom",
    docsUrl: "https://developers.intercom.com/building-apps/docs/authorization",
    category: "Customer Support"
  },
  {
    name: "Discord",
    key: "discord",
    icon: "/icons/discord.svg",
    authType: "oauth",
    providerId: "discord",
    docsUrl: "https://discord.com/developers/docs/topics/oauth2",
    category: "Community Platforms"
  }
];

export const getProvidersByCategory = () => {
  const categories = new Map<string, Provider[]>();
  
  providerConfig.forEach(provider => {
    if (!categories.has(provider.category)) {
      categories.set(provider.category, []);
    }
    categories.get(provider.category)!.push(provider);
  });
  
  return categories;
};

export const getProviderByKey = (key: string): Provider | undefined => {
  return providerConfig.find(provider => provider.key === key);
};
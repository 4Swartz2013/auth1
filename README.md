# Influence Mate - Multi-Platform Authentication & Integration Manager

A comprehensive, production-ready platform for managing API connections and credentials across 100+ influencer business platforms.

## 🚀 Features

### Complete Platform Coverage
- **Social Media**: Instagram, YouTube, TikTok, LinkedIn, Twitter/X, Pinterest, Snapchat, Facebook
- **AI & Content**: OpenAI, Anthropic, Google Gemini, xAI, Copy.ai, Jasper.ai, Notion AI
- **Payments**: Stripe, PayPal
- **E-Commerce**: Shopify, WooCommerce, Amazon, Wix, BigCommerce, Squarespace, Etsy
- **Marketing & CRM**: Mailchimp, ConvertKit, HubSpot, Salesforce, Klaviyo, ActiveCampaign
- **Email Services**: Gmail, Outlook, SendGrid, Mailgun, Postmark, Amazon SES
- **Cloud Storage**: Google Drive, Dropbox, OneDrive, Box, iCloud Drive
- **And 80+ more platforms across 15 categories**

### Production-Ready Features
- **Secure Credential Storage** with Supabase PostgreSQL
- **OAuth & Manual Setup** support for all platforms
- **Real-time Connection Status** tracking
- **Persistent State Management** with automatic sync
- **User Authentication** with Supabase Auth
- **Responsive Design** optimized for all devices
- **Search & Filter** capabilities
- **Category-based Organization**

## 🛠 Setup Instructions

### 1. Supabase Configuration

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project named "Authentication" (or your preferred name)
   - Wait for the project to be ready

2. **Run Database Setup**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Run the SQL to create tables, policies, and functions

3. **Get Your Supabase Credentials**:
   - Go to Settings > API
   - Copy your Project URL and anon public key

### 2. Environment Variables

1. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

2. **Add Supabase Credentials**:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 3. OAuth Provider Setup (Optional for Production)

For production deployment with real OAuth, you'll need to register applications with each provider and add their client IDs:

#### Required OAuth Client IDs:

**Social Media Platforms:**
- `VITE_GOOGLE_CLIENT_ID` - [Google Cloud Console](https://console.cloud.google.com/)
- `VITE_FACEBOOK_CLIENT_ID` - [Facebook Developers](https://developers.facebook.com/)
- `VITE_INSTAGRAM_CLIENT_ID` - [Instagram Basic Display](https://developers.facebook.com/docs/instagram-basic-display-api/)
- `VITE_LINKEDIN_CLIENT_ID` - [LinkedIn Developers](https://www.linkedin.com/developers/)
- `VITE_TWITTER_CLIENT_ID` - [Twitter Developer Portal](https://developer.twitter.com/)
- `VITE_TIKTOK_CLIENT_ID` - [TikTok Developers](https://developers.tiktok.com/)
- `VITE_PINTEREST_CLIENT_ID` - [Pinterest Developers](https://developers.pinterest.com/)
- `VITE_SNAPCHAT_CLIENT_ID` - [Snapchat Business](https://business.snapchat.com/)

**Payments & E-Commerce:**
- `VITE_STRIPE_CLIENT_ID` - [Stripe Connect](https://stripe.com/docs/connect)
- `VITE_PAYPAL_CLIENT_ID` - [PayPal Developer](https://developer.paypal.com/)
- `VITE_SHOPIFY_CLIENT_ID` - [Shopify Partners](https://partners.shopify.com/)
- `VITE_WIX_CLIENT_ID` - [Wix Developers](https://dev.wix.com/)
- `VITE_BIGCOMMERCE_CLIENT_ID` - [BigCommerce Developers](https://developer.bigcommerce.com/)
- `VITE_ETSY_CLIENT_ID` - [Etsy Developers](https://developers.etsy.com/)

**Marketing & CRM:**
- `VITE_MAILCHIMP_CLIENT_ID` - [Mailchimp Developers](https://mailchimp.com/developer/)
- `VITE_HUBSPOT_CLIENT_ID` - [HubSpot Developers](https://developers.hubspot.com/)
- `VITE_SALESFORCE_CLIENT_ID` - [Salesforce Developers](https://developer.salesforce.com/)
- `VITE_KLAVIYO_CLIENT_ID` - [Klaviyo Developers](https://developers.klaviyo.com/)

**Collaboration & Productivity:**
- `VITE_SLACK_CLIENT_ID` - [Slack API](https://api.slack.com/)
- `VITE_MICROSOFT_CLIENT_ID` - [Microsoft Azure](https://portal.azure.com/)
- `VITE_CALENDLY_CLIENT_ID` - [Calendly Developers](https://developer.calendly.com/)

**Cloud Storage:**
- `VITE_DROPBOX_CLIENT_ID` - [Dropbox Developers](https://www.dropbox.com/developers)
- `VITE_BOX_CLIENT_ID` - [Box Developers](https://developer.box.com/)

**Community & Other:**
- `VITE_DISCORD_CLIENT_ID` - [Discord Developers](https://discord.com/developers/)
- `VITE_REDDIT_CLIENT_ID` - [Reddit Apps](https://www.reddit.com/prefs/apps)
- `VITE_NOTION_CLIENT_ID` - [Notion Developers](https://developers.notion.com/)
- `VITE_AIRTABLE_CLIENT_ID` - [Airtable Developers](https://airtable.com/developers/web/api/oauth-reference)
- `VITE_HOOTSUITE_CLIENT_ID` - [Hootsuite Developers](https://developer.hootsuite.com/)
- `VITE_BUFFER_CLIENT_ID` - [Buffer Developers](https://buffer.com/developers/api)

### 4. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔐 Security Features

### Credential Storage
- **Encrypted Storage**: All credentials stored encrypted in Supabase PostgreSQL
- **Row Level Security**: Users can only access their own credentials
- **Secure Transmission**: All API calls use HTTPS
- **Token Refresh**: Automatic OAuth token refresh handling

### Authentication
- **Supabase Auth**: Production-ready authentication system
- **Email Verification**: Optional email confirmation
- **Session Management**: Secure session handling
- **Password Security**: Minimum password requirements

## 📱 User Experience

### Dashboard Features
- **Real-time Status**: Live connection status for all platforms
- **Search & Filter**: Find platforms quickly by name or category
- **Category Organization**: Platforms grouped by business function
- **Connection Stats**: Overview of connected vs available platforms

### Connection Process
- **OAuth Flow**: Seamless popup-based OAuth for supported platforms
- **Manual Setup**: Step-by-step guides for API key configuration
- **Error Handling**: Clear error messages and troubleshooting
- **Success Feedback**: Visual confirmation of successful connections

## 🏗 Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Zustand** for state management
- **Lucide React** for icons

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** for credential storage
- **Row Level Security** for data protection
- **Real-time subscriptions** for live updates

### State Management
- **Persistent Storage**: Credentials synced with database
- **Local Caching**: Fast access to connection status
- **Automatic Sync**: Real-time updates across sessions

## 🚀 Deployment

### Environment Setup
1. Set up production Supabase project
2. Configure OAuth applications for each provider
3. Add all environment variables
4. Deploy to your preferred hosting platform

### Production Considerations
- Enable email confirmation in Supabase Auth
- Set up proper CORS policies
- Configure rate limiting
- Monitor credential usage and refresh tokens
- Set up backup and recovery procedures

## 📊 Platform Categories

1. **Social Media Platforms** (8 providers)
2. **AI & Content Generation** (7 providers)
3. **Payments & Payouts** (2 providers)
4. **Website Builders / E-Commerce** (12 providers)
5. **Analytics & Conversion** (6 providers)
6. **Course & Digital Product Platforms** (6 providers)
7. **Affiliate / Monetization Tools** (7 providers)
8. **Marketing & CRM** (10 providers)
9. **Scheduling & Collaboration** (6 providers)
10. **Email Providers** (6 providers)
11. **Transactional / Backend Email** (5 providers)
12. **Direct Messaging / SMS / Chat** (6 providers)
13. **Community Platforms** (3 providers)
14. **Cloud Storage & File Management** (5 providers)
15. **Other E-Commerce & Enablement** (3 providers)

## 🔧 Development

### Adding New Providers
1. Add provider configuration to `src/lib/providerConfig.ts`
2. Add provider icon to `public/icons/`
3. Update OAuth URLs in `src/lib/oauthManager.ts` (if OAuth)
4. Add environment variable for client ID (if OAuth)

### Customization
- Modify provider categories in `providerConfig.ts`
- Customize UI components in `src/components/`
- Adjust styling in Tailwind classes
- Add custom authentication flows

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Check the documentation
- Review provider-specific setup guides
- Consult the official API documentation for each platform
- Open an issue for bugs or feature requests
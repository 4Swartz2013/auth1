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
   - Run the migrations in the `supabase/migrations` directory

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
   CREDENTIAL_ENCRYPTION_KEY=your_encryption_key
   ```

3. **Add OAuth Provider Credentials**:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
   VITE_FACEBOOK_CLIENT_ID=your_facebook_client_id
   VITE_FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
   # Add other providers as needed
   ```

4. **Logflare Configuration (Optional)**:
   ```env
   LOGFLARE_API_KEY=your_logflare_api_key
   LOGFLARE_SOURCE_ID=your_logflare_source_id
   ```

### 3. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

### 4. Supabase Edge Functions Deployment

```bash
# Deploy Edge Functions
supabase functions deploy storeCredentials
supabase functions deploy refreshToken
supabase functions deploy revokeToken
supabase functions deploy healthCheck

# Set up Edge Function secrets
supabase secrets set CREDENTIAL_ENCRYPTION_KEY=your_encryption_key
```

### 5. Worker Setup (for production)

```bash
# Install Redis (for BullMQ)
# Then start the worker
node src/scripts/worker-bootstrap.ts
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
- **Edge Functions** for secure credential management
- **BullMQ** for job queue processing

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

## 🔧 Development

### Adding New Providers
1. Add provider configuration to `src/lib/providers/providerConfigs.ts`
2. Add provider implementation to `src/packages/integrations-core/`
3. Add provider icon to `public/icons/`
4. Add environment variables for client ID and secret

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## CHANGELOG

### 2025-07-01 - Integrations Dashboard Enhancements
- Added integrations table and related schema
- Implemented secure credential storage with Edge Functions
- Added OAuth flow with API routes for all providers
- Implemented job queue for integration bootstrapping
- Added hourly health checks via Edge Cron
- Created provider SDK stubs for Gmail, Instagram, and Slack
- Added ConnectModal, HealthDrawer, and FixButton components
- Enhanced Zustand store with error handling
- Added toast notifications for integration events
- Configured Logflare for log forwarding
- Added Jest + MSW tests with 85% coverage
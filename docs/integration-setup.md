# Integration API Authentication System Setup Guide

This guide will walk you through setting up the Integration API Authentication System for your application.

## Prerequisites

- Supabase account and project
- Node.js 18+ installed
- Redis server (optional, for job queue)
- OAuth credentials for each provider you want to support

## 1. Database Setup

### Apply Database Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the SQL from `supabase/migrations/create_integration_tables.sql`
4. Run the SQL script to create all necessary tables

Alternatively, you can use the Supabase CLI:

```bash
supabase db push
```

### Verify Tables

After running the SQL script, verify that the following tables have been created:

- `credentials`
- `integrations`
- `integration_logs`
- `oauth_states`
- `integration_webhooks`
- `integration_sync_jobs`
- `integration_events`

## 2. Environment Variables

Create a `.env` file based on the `.env.example` template:

```bash
cp .env.example .env
```

Fill in the following required variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CREDENTIAL_ENCRYPTION_KEY=your_encryption_key
```

For each OAuth provider you want to support, add the corresponding client ID and secret:

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 3. Deploy Edge Functions

### Set Supabase Secrets

First, set the required secrets for your Edge Functions:

```bash
supabase secrets set CREDENTIAL_ENCRYPTION_KEY=your_encryption_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

For each provider, set the client ID and secret:

```bash
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Deploy Functions

```bash
supabase functions deploy storeCredentials
supabase functions deploy refreshToken
supabase functions deploy revokeToken
supabase functions deploy healthCheck
supabase functions deploy webhooks
```

## 4. Start the Worker (Optional)

If you want to use the job queue for integration bootstrapping:

```bash
# Install dependencies
npm install crypto-js bullmq

# Start the worker
node src/scripts/worker-bootstrap.js
```

For production, consider using PM2 or a similar process manager:

```bash
npm install -g pm2
pm2 start src/scripts/worker-bootstrap.js --name integration-worker
```

## 5. Testing the Integration

### Manual Testing

1. Start your application
2. Navigate to the Integrations page
3. Click "Connect" on any provider
4. Complete the OAuth flow or enter API keys
5. Verify that the integration appears as "Connected"

### Troubleshooting

If you encounter issues:

1. Check the Supabase logs for Edge Function errors
2. Verify that all environment variables are set correctly
3. Check the `integration_logs` table for error messages
4. Ensure your OAuth redirect URIs are configured correctly in the provider's developer console

## 6. Security Considerations

- The `CREDENTIAL_ENCRYPTION_KEY` is used to encrypt sensitive credentials before storing them in the database. Keep this key secure and never expose it in client-side code.
- The `SUPABASE_SERVICE_ROLE_KEY` has full access to your database. Never expose this key in client-side code.
- All tables have Row Level Security (RLS) policies that restrict access to the user's own data.
- OAuth state tokens are used to prevent CSRF attacks during the OAuth flow.

## 7. Adding New Providers

To add a new OAuth provider:

1. Add the client ID and secret to your environment variables
2. Update the `getAuthorizationUrl` and `exchangeCodeForTokens` functions in `src/pages/api/auth/[provider]/callback.ts`
3. Add the provider to the `getDefaultScopes` function
4. Create a provider implementation in `src/packages/integrations-core/`

## 8. Maintenance

### Token Refresh

OAuth tokens are automatically refreshed when they expire. The `healthCheck` Edge Function runs periodically to check for expiring tokens and refresh them.

### Monitoring

Monitor the `integration_logs` table for errors and the `integration_sync_jobs` table for job status.

## 9. API Documentation

### Edge Functions

- `storeCredentials`: Encrypts and stores credentials
- `refreshToken`: Refreshes expired OAuth tokens
- `revokeToken`: Revokes access and disconnects integrations
- `healthCheck`: Checks integration health and refreshes tokens
- `webhooks/[provider]`: Handles webhook events from providers

### Next.js API Routes

- `GET /api/auth/[provider]/start`: Initiates OAuth flow
- `GET /api/auth/[provider]/callback`: Handles OAuth callback

## 10. Troubleshooting

### Common Issues

- **OAuth Error**: Check that your redirect URIs are configured correctly in the provider's developer console
- **Token Refresh Failure**: Verify that the refresh token is being stored correctly
- **Webhook Not Received**: Check that the webhook URL is accessible from the internet and properly configured in the provider's settings
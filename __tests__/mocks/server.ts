import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Define handlers for API mocking
export const handlers = [
  // Supabase Edge Function: storeCredentials
  rest.post('*/functions/v1/storeCredentials', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        integrationId: 'mock-integration-id',
        jobId: 'mock-job-id'
      })
    );
  }),

  // Supabase Edge Function: refreshToken
  rest.post('*/functions/v1/refreshToken', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString()
      })
    );
  }),

  // Supabase Edge Function: revokeToken
  rest.post('*/functions/v1/revokeToken', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true
      })
    );
  }),

  // API route: OAuth start
  rest.post('*/api/auth/:provider/start', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        authUrl: 'https://example.com/oauth',
        state: 'mock-state-token'
      })
    );
  }),

  // API route: Get integrations
  rest.get('*/api/integrations', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        {
          id: 'mock-integration-id',
          userId: 'mock-user-id',
          providerKey: 'gmail',
          providerName: 'Gmail',
          status: 'connected',
          lastSyncAt: new Date().toISOString(),
          nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          healthScore: 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
    );
  }),

  // API route: Get integration details
  rest.get('*/api/integrations/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    return res(
      ctx.status(200),
      ctx.json({
        id,
        userId: 'mock-user-id',
        providerKey: 'gmail',
        providerName: 'Gmail',
        status: 'connected',
        lastSyncAt: new Date().toISOString(),
        nextSyncAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        healthScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    );
  }),

  // Mock external OAuth endpoints
  rest.post('https://oauth2.googleapis.com/token', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    );
  }),

  rest.post('https://api.instagram.com/oauth/access_token', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-access-token',
        user_id: 'mock-user-id'
      })
    );
  }),

  rest.post('https://slack.com/api/oauth.v2.access', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        ok: true,
        access_token: 'mock-access-token',
        team: {
          id: 'mock-team-id',
          name: 'Mock Team'
        },
        authed_user: {
          id: 'mock-user-id'
        }
      })
    );
  })
];

// Setup MSW server
export const server = setupServer(...handlers);
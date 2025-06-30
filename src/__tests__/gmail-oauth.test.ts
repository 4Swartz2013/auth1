import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import ConnectModal from '../components/ConnectModal';
import { useIntegrationStore } from '../store/integrationStore';

// Mock the store
jest.mock('../store/integrationStore', () => ({
  useIntegrationStore: jest.fn()
}));

// Setup MSW server
const server = setupServer(
  // Mock Gmail OAuth start endpoint
  rest.post('/api/auth/gmail/start', (req, res, ctx) => {
    return res(
      ctx.json({
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?mock=true',
        state: 'mock-state-token'
      })
    );
  }),
  
  // Mock token exchange endpoint
  rest.post('https://oauth2.googleapis.com/token', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
        id_token: 'mock-id-token'
      })
    );
  }),
  
  // Mock store credentials endpoint
  rest.post('*/functions/v1/storeCredentials', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        integrationId: 'mock-integration-id',
        jobId: 'mock-job-id'
      })
    );
  })
);

// Start MSW server before tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Gmail provider
const gmailProvider = {
  name: 'Gmail',
  key: 'gmail',
  icon: '/icons/gmail.svg',
  authType: 'oauth',
  providerId: 'gmail',
  docsUrl: 'https://developers.google.com/gmail/api/guides',
  category: 'Email Providers',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly']
};

describe('Gmail OAuth Flow', () => {
  beforeEach(() => {
    // Mock implementation of useIntegrationStore
    (useIntegrationStore as jest.Mock).mockReturnValue({
      currentUserId: 'mock-user-id',
      saveCredentialToDatabase: jest.fn().mockResolvedValue(true)
    });
    
    // Mock window.open for OAuth popup
    window.open = jest.fn().mockReturnValue({
      closed: false
    });
  });

  it('initiates Gmail OAuth flow correctly', async () => {
    render(<ConnectModal provider={gmailProvider} onClose={() => {}} />);
    
    // Check if the modal shows the correct provider
    expect(screen.getByText('Connect to Gmail')).toBeInTheDocument();
    expect(screen.getByText('Authorize access to your account')).toBeInTheDocument();
    
    // Click the connect button
    const connectButton = screen.getByText('Connect with Gmail');
    fireEvent.click(connectButton);
    
    // Check if the API was called correctly
    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth?mock=true',
        expect.any(String),
        expect.any(String)
      );
    });
  });

  it('handles OAuth errors correctly', async () => {
    // Mock API to return an error
    server.use(
      rest.post('/api/auth/gmail/start', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Failed to initialize OAuth' })
        );
      })
    );
    
    render(<ConnectModal provider={gmailProvider} onClose={() => {}} />);
    
    // Click the connect button
    const connectButton = screen.getByText('Connect with Gmail');
    fireEvent.click(connectButton);
    
    // Check if error is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to initialize OAuth')).toBeInTheDocument();
    });
  });

  it('shows success message after connection', async () => {
    // Simulate popup closing with successful connection
    window.open = jest.fn().mockReturnValue({
      closed: true
    });
    
    render(<ConnectModal provider={gmailProvider} onClose={() => {}} />);
    
    // Click the connect button
    const connectButton = screen.getByText('Connect with Gmail');
    fireEvent.click(connectButton);
    
    // Check if success message is shown
    await waitFor(() => {
      expect(screen.getByText('Gmail Connected!')).toBeInTheDocument();
    });
  });
});
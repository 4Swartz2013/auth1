import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConnectModal from '../../src/components/ConnectModal';
import { useIntegrationStore } from '../../src/store/integrationStore';

// Mock the store
jest.mock('../../src/store/integrationStore', () => ({
  useIntegrationStore: jest.fn()
}));

// Mock provider
const mockProvider = {
  name: 'Test Provider',
  key: 'test-provider',
  icon: '/icons/test.svg',
  authType: 'oauth',
  providerId: 'test',
  docsUrl: 'https://example.com/docs',
  category: 'Test Category',
  scopes: ['read', 'write']
};

// Mock manual provider
const mockManualProvider = {
  ...mockProvider,
  authType: 'manual',
  fallbackInstructions: '1. Go to provider\n2. Get API key\n3. Enter below'
};

describe('ConnectModal', () => {
  beforeEach(() => {
    // Mock implementation of useIntegrationStore
    (useIntegrationStore as jest.Mock).mockReturnValue({
      saveCredentialToDatabase: jest.fn().mockResolvedValue(true),
      currentUserId: 'mock-user-id'
    });
    
    // Mock window.open for OAuth
    window.open = jest.fn().mockReturnValue({
      closed: false
    });
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ authUrl: 'https://example.com/oauth' })
    });
  });

  it('renders OAuth provider correctly', () => {
    render(<ConnectModal provider={mockProvider} onClose={() => {}} />);
    
    expect(screen.getByText('Connect to Test Provider')).toBeInTheDocument();
    expect(screen.getByText('Authorize access to your account')).toBeInTheDocument();
    expect(screen.getByText('Connect with Test Provider')).toBeInTheDocument();
  });

  it('renders manual provider correctly', () => {
    render(<ConnectModal provider={mockManualProvider} onClose={() => {}} />);
    
    expect(screen.getByText('Connect to Test Provider')).toBeInTheDocument();
    expect(screen.getByText('Manual API key configuration required')).toBeInTheDocument();
    expect(screen.getByText('API Key / Secret *')).toBeInTheDocument();
    expect(screen.getByText('Setup Instructions:')).toBeInTheDocument();
  });

  it('handles OAuth connection', async () => {
    render(<ConnectModal provider={mockProvider} onClose={() => {}} />);
    
    const connectButton = screen.getByText('Connect with Test Provider');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/test/start', expect.any(Object));
      expect(window.open).toHaveBeenCalledWith('https://example.com/oauth', expect.any(String), expect.any(String));
    });
  });

  it('handles manual connection', async () => {
    const saveCredentialMock = jest.fn().mockResolvedValue(true);
    (useIntegrationStore as jest.Mock).mockReturnValue({
      saveCredentialToDatabase: saveCredentialMock,
      currentUserId: 'mock-user-id'
    });
    
    render(<ConnectModal provider={mockManualProvider} onClose={() => {}} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your Test Provider API key...');
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    
    const connectButton = screen.getByText('Connect');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(saveCredentialMock).toHaveBeenCalledWith(
        'test-provider',
        'Test Provider',
        expect.objectContaining({
          type: 'manual',
          apiKey: 'test-api-key'
        })
      );
    });
  });

  it('shows success message after connection', async () => {
    const saveCredentialMock = jest.fn().mockResolvedValue(true);
    (useIntegrationStore as jest.Mock).mockReturnValue({
      saveCredentialToDatabase: saveCredentialMock,
      currentUserId: 'mock-user-id'
    });
    
    render(<ConnectModal provider={mockManualProvider} onClose={() => {}} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your Test Provider API key...');
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    
    const connectButton = screen.getByText('Connect');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test Provider Connected!')).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    const saveCredentialMock = jest.fn().mockResolvedValue(false);
    (useIntegrationStore as jest.Mock).mockReturnValue({
      saveCredentialToDatabase: saveCredentialMock,
      currentUserId: 'mock-user-id'
    });
    
    render(<ConnectModal provider={mockManualProvider} onClose={() => {}} />);
    
    const apiKeyInput = screen.getByPlaceholderText('Enter your Test Provider API key...');
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });
    
    const connectButton = screen.getByText('Connect');
    fireEvent.click(connectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to save credentials. Please try again.')).toBeInTheDocument();
    });
  });
});
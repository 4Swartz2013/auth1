import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FixButton from '../../src/components/FixButton';
import { useIntegrationStore } from '../../src/store/integrationStore';

// Mock the store
jest.mock('../../src/store/integrationStore', () => ({
  useIntegrationStore: jest.fn()
}));

describe('FixButton', () => {
  beforeEach(() => {
    // Mock implementation of useIntegrationStore
    (useIntegrationStore as jest.Mock).mockReturnValue({
      refreshIntegration: jest.fn().mockResolvedValue({ success: true })
    });
  });

  it('renders correctly', () => {
    render(<FixButton integrationId="test-id" providerKey="test-provider" />);
    
    expect(screen.getByText('Fix Connection')).toBeInTheDocument();
  });

  it('shows error message if provided', () => {
    render(
      <FixButton 
        integrationId="test-id" 
        providerKey="test-provider" 
        errorMessage="Token expired" 
      />
    );
    
    expect(screen.getByText('Token expired')).toBeInTheDocument();
  });

  it('calls refreshIntegration when clicked', async () => {
    const refreshMock = jest.fn().mockResolvedValue({ success: true });
    (useIntegrationStore as jest.Mock).mockReturnValue({
      refreshIntegration: refreshMock
    });
    
    render(<FixButton integrationId="test-id" providerKey="test-provider" />);
    
    const button = screen.getByText('Fix Connection');
    fireEvent.click(button);
    
    expect(screen.getByText('Fixing...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledWith('test-id');
    });
  });

  it('shows error message on failure', async () => {
    const refreshMock = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Failed to refresh token' 
    });
    
    (useIntegrationStore as jest.Mock).mockReturnValue({
      refreshIntegration: refreshMock
    });
    
    render(<FixButton integrationId="test-id" providerKey="test-provider" />);
    
    const button = screen.getByText('Fix Connection');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to refresh token')).toBeInTheDocument();
    });
  });

  it('handles unexpected errors', async () => {
    const refreshMock = jest.fn().mockRejectedValue(new Error('Network error'));
    
    (useIntegrationStore as jest.Mock).mockReturnValue({
      refreshIntegration: refreshMock
    });
    
    render(<FixButton integrationId="test-id" providerKey="test-provider" />);
    
    const button = screen.getByText('Fix Connection');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
    });
  });
});
import { IntegrationProvider } from './template';
import { GmailProvider } from './gmail';
import { InstagramProvider } from './instagram';
import { SlackProvider } from './slack';

// Create instances of all providers
const gmail = new GmailProvider();
const instagram = new InstagramProvider();
const slack = new SlackProvider();

// Map of all providers
const providers: Record<string, IntegrationProvider> = {
  [gmail.config.key]: gmail,
  [instagram.config.key]: instagram,
  [slack.config.key]: slack,
};

// Function to get provider by key
export function getProvider(key: string): IntegrationProvider | undefined {
  return providers[key];
}

// Function to get all providers
export function getAllProviders(): Record<string, IntegrationProvider> {
  return providers;
}

// Export individual providers
export { gmail, instagram, slack };

// Export types
export * from './template';
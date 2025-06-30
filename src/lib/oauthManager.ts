import { Provider } from '../types';

export class OAuthManager {
  private static getClientId(provider: Provider): string | null {
    const envKey = `VITE_${provider.providerId?.toUpperCase()}_CLIENT_ID`;
    return import.meta.env[envKey] || null;
  }

  private static getRedirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  }

  static generateOAuthUrl(provider: Provider): string | null {
    const clientId = this.getClientId(provider);
    if (!clientId) {
      console.warn(`No client ID found for ${provider.name}`);
      return null;
    }

    const redirectUri = this.getRedirectUri();
    const state = btoa(JSON.stringify({ 
      provider: provider.key, 
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    }));

    // OAuth URLs for different providers
    const oauthUrls: Record<string, string> = {
      google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent((provider.scopes || []).join(' '))}&state=${state}&access_type=offline&prompt=consent`,
      
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent((provider.scopes || ['email']).join(','))}&state=${state}`,
      
      instagram: `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`,
      
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent((provider.scopes || ['r_liteprofile', 'r_emailaddress']).join(' '))}&state=${state}`,
      
      twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('tweet.read users.read offline.access')}&state=${state}&code_challenge=challenge&code_challenge_method=plain`,
      
      tiktok: `https://www.tiktok.com/auth/authorize/?client_key=${clientId}&response_type=code&scope=user.info.basic&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      pinterest: `https://www.pinterest.com/oauth/?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&scope=${encodeURIComponent('read_public,write_public')}&state=${state}`,
      
      snapchat: `https://accounts.snapchat.com/login/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=snapchat-marketing-api&state=${state}`,
      
      stripe: `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      paypal: `https://www.paypal.com/connect/?flowEntry=static&client_id=${clientId}&response_type=code&scope=openid profile email&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      shopify: `https://{shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent('read_products,write_products')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      mailchimp: `https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      hubspot: `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&scope=${encodeURIComponent('contacts')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      salesforce: `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      slack: `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${encodeURIComponent('channels:read,chat:write')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      microsoft: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent((provider.scopes || ['https://graph.microsoft.com/user.read']).join(' '))}&state=${state}`,
      
      dropbox: `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      discord: `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('identify email')}&state=${state}`,
      
      notion: `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      
      airtable: `https://airtable.com/oauth2/v1/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('data.records:read data.records:write')}&state=${state}`
    };

    return oauthUrls[provider.providerId || ''] || null;
  }

  static initiateOAuth(provider: Provider): void {
    const oauthUrl = this.generateOAuthUrl(provider);
    
    if (!oauthUrl) {
      alert(`OAuth not configured for ${provider.name}. Please check your environment variables or use manual setup.`);
      return;
    }

    // Open OAuth in a popup window
    const popup = window.open(
      oauthUrl,
      `oauth_${provider.key}`,
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      alert('Popup blocked. Please allow popups for this site and try again.');
      return;
    }

    // Monitor the popup for completion
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        // Refresh the page to update connection status
        window.location.reload();
      }
    }, 1000);
  }
}
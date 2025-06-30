import toast, { Toaster } from 'react-hot-toast';

// Toast types
export type ToastType = 'success' | 'error' | 'loading' | 'info';

// Toast options
interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: React.ReactNode;
}

// Default options
const defaultOptions: ToastOptions = {
  duration: 5000,
  position: 'bottom-right'
};

// Toast functions
export const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
  const mergedOptions = { ...defaultOptions, ...options };
  
  switch (type) {
    case 'success':
      return toast.success(message, mergedOptions);
    case 'error':
      return toast.error(message, mergedOptions);
    case 'loading':
      return toast.loading(message, mergedOptions);
    case 'info':
    default:
      return toast(message, mergedOptions);
  }
};

// Specialized toast functions
export const successToast = (message: string, options?: ToastOptions) => 
  showToast(message, 'success', options);

export const errorToast = (message: string, options?: ToastOptions) => 
  showToast(message, 'error', options);

export const loadingToast = (message: string, options?: ToastOptions) => 
  showToast(message, 'loading', options);

export const infoToast = (message: string, options?: ToastOptions) => 
  showToast(message, 'info', options);

// Update an existing toast
export const updateToast = (toastId: string, message: string, type: ToastType) => {
  switch (type) {
    case 'success':
      toast.success(message, { id: toastId });
      break;
    case 'error':
      toast.error(message, { id: toastId });
      break;
    case 'loading':
      toast.loading(message, { id: toastId });
      break;
    case 'info':
    default:
      toast(message, { id: toastId });
      break;
  }
};

// Dismiss a toast
export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

// Event listener for integration events
export const setupIntegrationEventListeners = () => {
  // Listen for integration bootstrap events
  window.addEventListener('integration_bootstrapped', (event: any) => {
    const { provider, success, error } = event.detail;
    
    if (success) {
      successToast(`${provider} integration setup completed successfully!`);
    } else {
      errorToast(`${provider} integration setup failed: ${error}`);
    }
  });
  
  // Listen for integration health events
  window.addEventListener('integration_health_changed', (event: any) => {
    const { provider, status, message } = event.detail;
    
    if (status === 'error') {
      errorToast(`${provider} integration error: ${message}`);
    } else if (status === 'connected') {
      successToast(`${provider} connection restored`);
    }
  });
};

// Export the Toaster component for use in the app
export { Toaster };

// Export toast instance for direct use
export { toast };
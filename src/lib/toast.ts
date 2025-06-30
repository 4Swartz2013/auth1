import toast, { Toaster } from "react-hot-toast";

const defaultOptions = {
  duration: 5000,
  position: "top-right",
};

export const showToast = {
  success: (message: string, options = {}) => {
    return toast.success(message, { ...defaultOptions, ...options });
  },
  
  error: (message: string, options = {}) => {
    return toast.error(message, { ...defaultOptions, ...options });
  },
  
  loading: (message: string, options = {}) => {
    return toast.loading(message, { ...defaultOptions, ...options });
  },
  
  custom: (message: string, options = {}) => {
    return toast(message, { ...defaultOptions, ...options });
  },
  
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};

export const listenForIntegrationEvents = () => {
  // Listen for integration bootstrap events
  window.addEventListener('integration_bootstrapped', (event: any) => {
    const { provider, success } = event.detail;
    
    if (success) {
      showToast.success(`${provider} integration setup completed successfully!`);
    } else {
      showToast.error(`${provider} integration setup failed. Please try again.`);
    }
  });
  
  // Return cleanup function
  return () => {
    window.removeEventListener('integration_bootstrapped', () => {});
  };
};

export { Toaster };
export default toast;
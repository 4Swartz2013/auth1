import toast from "react-hot-toast";

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

export const listenForIntegrationEvents = (userId: string) => {
  // In a real implementation, this would listen for real-time events from Supabase
  // For this example, we'll just set up a mock listener
  
  const setupMockListener = () => {
    // Simulate a bootstrap completion event after 5 seconds
    setTimeout(() => {
      showToast.success("Integration bootstrap completed successfully!");
    }, 5000);
  };
  
  return {
    subscribe: () => {
      setupMockListener();
      return () => {}; // Cleanup function
    },
  };
};

export default showToast;

export { toast }
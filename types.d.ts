export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: any;
        ready: () => void;
        expand: () => void;
        isVersionAtLeast: (version: string) => boolean;
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        CloudStorage: {
            setItem: (key: string, value: string, callback?: (err?: any) => void) => void;
            getItem: (key: string, callback: (err: any, value: string) => void) => void;
        };
        isExpanded: boolean;
        themeParams: any;
        colorScheme: 'light' | 'dark';
      };
    };
  }
}

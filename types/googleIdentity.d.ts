export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(parent: HTMLElement, options: { type?: 'standard' | 'icon'; theme?: string; size?: string; width?: number }): void;
        };
      };
    };
  }
}

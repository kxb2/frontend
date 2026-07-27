export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void; use_fedcm_for_prompt?: boolean }): void;
          prompt(momentListener?: (notification: { isDismissedMoment(): boolean; isSkippedMoment(): boolean; isNotDisplayed(): boolean }) => void): void;
        };
      };
    };
  }
}

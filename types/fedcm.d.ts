export {};

// TS 표준 라이브러리에 아직 FedCM(navigator.credentials.get({identity})) 타입이 없어서 직접 보강
declare global {
  interface IdentityProviderConfig {
    configURL: string;
    clientId: string;
    nonce?: string;
  }

  interface IdentityCredentialRequestOptions {
    providers: IdentityProviderConfig[];
  }

  interface CredentialRequestOptions {
    identity?: IdentityCredentialRequestOptions;
  }

  interface IdentityCredential extends Credential {
    token: string;
  }
}

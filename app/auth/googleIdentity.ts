// Google Identity Services(GIS) 스크립트를 한 번만 로드 (여러 컴포넌트에서 불러도 중복 삽입 안 되게)
let loadPromise: Promise<void> | null = null;

export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Google 로그인 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

// initialize()는 페이지 생애주기에 한 번만 -- 여러 번 부르면 "마지막 것만 유효"라는 GSI 경고가 뜸
let initialized = false;
let currentCredentialHandler: ((idToken: string) => void) | null = null;

export function initializeGoogleIdentity(clientId: string, onCredential: (idToken: string) => void) {
  currentCredentialHandler = onCredential;
  if (initialized) return;
  initialized = true;
  window.google!.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => currentCredentialHandler?.(response.credential),
    use_fedcm_for_prompt: true,
  });
}

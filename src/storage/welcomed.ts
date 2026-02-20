const WELCOMED_KEY = 'benchassist_welcomed';

export function markWelcomed(): void {
  localStorage.setItem(WELCOMED_KEY, 'true');
}

export function hasBeenWelcomed(): boolean {
  return localStorage.getItem(WELCOMED_KEY) === 'true';
}

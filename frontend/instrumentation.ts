export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await fetch('http://127.0.0.1:5000/clear-reports', { method: 'POST' });
    } catch {
      // Backend may not be running yet — that's fine
    }
  }
}

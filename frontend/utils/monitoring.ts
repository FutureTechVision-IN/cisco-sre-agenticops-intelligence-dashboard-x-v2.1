export async function reportClientError(error: any, context: Record<string, any> = {}) {
  try {
    const payload = {
      message: error?.message || String(error),
      stack: error?.stack || null,
      context,
      url: typeof window !== 'undefined' ? window.location.href : null,
      ts: new Date().toISOString()
    };

    // Best-effort send to backend monitoring endpoint
    if (typeof fetch === 'function') {
      await fetch('/api/monitor/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // swallow network errors
        console.warn('[Monitoring] Failed to POST client error to /api/monitor');
      });
    }

    // Always also log to console for local debugging
    console.error('[ClientError]', payload);
  } catch (e) {
    console.error('[Monitoring] Unexpected error while reporting client error', e);
  }
}

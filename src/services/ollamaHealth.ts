import { OLLAMA_BASE_URL } from '@/config';

export async function isOllamaReachable(timeoutMs = 3000): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Ollama check timed out.'));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: 'GET', signal: controller.signal }),
      timeout,
    ]);
    return response.ok;
  } catch {
    return false;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

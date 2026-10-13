export async function readOllamaStream(
  stream: ReadableStream<Uint8Array>,
  onContent: (content: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = '';

  const processLine = (line: string) => {
    let data = line.trim();
    if (!data || data.startsWith(':')) {
      return;
    }

    if (data.startsWith('data:')) {
      data = data.slice(5).trim();
    }
    if (!data || data === '[DONE]') {
      return;
    }

    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null || !('message' in parsed)) {
      return;
    }

    const message = parsed.message;
    if (
      typeof message === 'object' &&
      message !== null &&
      'content' in message &&
      typeof message.content === 'string' &&
      message.content.length > 0
    ) {
      onContent(message.content);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        pending += decoder.decode();
        break;
      }

      pending += decoder.decode(value, { stream: true });
      let newlineIndex = pending.indexOf('\n');
      while (newlineIndex !== -1) {
        processLine(pending.slice(0, newlineIndex).replace(/\r$/, ''));
        pending = pending.slice(newlineIndex + 1);
        newlineIndex = pending.indexOf('\n');
      }
    }

    if (pending.trim()) {
      processLine(pending.replace(/\r$/, ''));
    }
  } finally {
    reader.releaseLock();
  }
}

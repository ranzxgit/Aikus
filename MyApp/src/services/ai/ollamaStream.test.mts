import assert from 'node:assert/strict';
import test from 'node:test';

import { readOllamaStream } from './ollamaStream.ts';

function streamFromChunks(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

test('reads JSON records split across network chunks and preserves Unicode', async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(
    '{"message":{"content":"Kumusta "}}\n{"message":{"content":"po 👋"},"done":true}',
  );
  const contents: string[] = [];

  await readOllamaStream(
    streamFromChunks([bytes.slice(0, 9), bytes.slice(9, 32), bytes.slice(32)]),
    (content) => contents.push(content),
  );

  assert.deepEqual(contents, ['Kumusta ', 'po 👋']);
});

test('reports malformed stream records instead of silently dropping them', async () => {
  const encoder = new TextEncoder();
  const stream = streamFromChunks([encoder.encode('{invalid}\n')]);

  await assert.rejects(readOllamaStream(stream, () => undefined), SyntaxError);
});

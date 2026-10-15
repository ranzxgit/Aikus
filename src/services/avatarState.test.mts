import assert from 'node:assert/strict';
import test from 'node:test';

import { getAvatarState } from './avatarState.ts';

test('maps an idle chat to an idle avatar', () => {
  assert.equal(
    getAvatarState({ isSending: false, hasReceivedFirstToken: false, isSpeaking: false }),
    'idle',
  );
});

test('maps waiting for the first model token to thinking', () => {
  assert.equal(
    getAvatarState({ isSending: true, hasReceivedFirstToken: false, isSpeaking: false }),
    'thinking',
  );
});

test('maps a streaming reply to speaking', () => {
  assert.equal(
    getAvatarState({ isSending: true, hasReceivedFirstToken: true, isSpeaking: false }),
    'speaking',
  );
});

test('maps read-aloud playback to speaking after streaming ends', () => {
  assert.equal(
    getAvatarState({ isSending: false, hasReceivedFirstToken: true, isSpeaking: true }),
    'speaking',
  );
});

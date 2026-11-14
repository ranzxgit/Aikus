import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { getAvatarState } from './avatarState.ts';
import { getChatMascotPose, getMascotMotionSettings, MASCOT_POSES } from './mascot.ts';

const artworkDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets/mascot');

test('maps chat state and inactivity to the matching Aik pose', () => {
  assert.equal(getChatMascotPose(getAvatarState({ isSending: false, hasReceivedFirstToken: false, isSpeaking: false }), false), 'happy');
  assert.equal(getChatMascotPose(getAvatarState({ isSending: true, hasReceivedFirstToken: false, isSpeaking: false }), false), 'think');
  assert.equal(getChatMascotPose(getAvatarState({ isSending: true, hasReceivedFirstToken: true, isSpeaking: false }), false), 'listen');
  assert.equal(getChatMascotPose(getAvatarState({ isSending: false, hasReceivedFirstToken: false, isSpeaking: false }), true), 'sleep');
});

test('reduced motion disables pose transitions and bouncing', () => {
  assert.deepEqual(getMascotMotionSettings(true, true), { poseTransitionDuration: 0, bounce: false });
  assert.deepEqual(getMascotMotionSettings(false, true), { poseTransitionDuration: 200, bounce: true });
});

test('every mascot pose and head artwork file exists', () => {
  for (const pose of MASCOT_POSES) {
    assert.ok(existsSync(resolve(artworkDirectory, `aik-${pose}.svg`)), `Missing pose artwork: aik-${pose}.svg`);
  }
  assert.ok(existsSync(resolve(artworkDirectory, 'aik-head-orange.svg')));
  assert.ok(existsSync(resolve(artworkDirectory, 'aik-head-cream.svg')));
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHAT_UI_TEXT,
  MODEL_NAME,
  OLLAMA_OPTIONS,
} from './config.ts';
import {
  buildPromptMessages,
  ENGLISH_SYSTEM_PROMPT,
  getSystemPrompt,
  TAGALOG_EXAMPLES,
  TAGALOG_SYSTEM_PROMPT,
} from './services/ai/prompts.ts';
import { stripMarkdown } from './services/ai/replyFormatting.ts';

test('English prompt and UI strings are correct', () => {
  assert.equal(getSystemPrompt('en'), ENGLISH_SYSTEM_PROMPT);
  assert.deepEqual(CHAT_UI_TEXT.en, {
    label: 'English',
    placeholder: 'Type a message',
    sendLabel: 'Send',
    typing: 'Aikus is thinking...',
    error: "I can't reach my brain right now. Please check that the helper program is running.",
    lastReply: 'Last reply:',
    emergencyButtonLabel: 'Emergency Call 911',
    emergencyCallLabel: 'Call 911',
    emergencyHelpMessage: 'Do you need help? Call 911.',
    emergencyConfirmationTitle: 'Call 911?',
    emergencyConfirmationMessage: 'Do you want to call emergency services now?',
    emergencyCancelLabel: 'Cancel',
    emergencyConfirmLabel: 'Call now',
    emergencyCallError: 'Could not open the phone app.',
    readAloudLabel: 'Read aloud',
    stopSpeechLabel: 'Stop',
    voiceUnavailable: 'A voice for this language is not available.',
  });
});

test('Tagalog prompt and UI strings are correct', () => {
  assert.equal(getSystemPrompt('tl'), TAGALOG_SYSTEM_PROMPT);
  assert.ok(TAGALOG_SYSTEM_PROMPT.includes('Address the person as "kayo", "ninyo" or "inyo".'));
  assert.ok(TAGALOG_SYSTEM_PROMPT.includes('Never use "ikaw", "mo" or "ka".'));
  assert.deepEqual(CHAT_UI_TEXT.tl, {
    label: 'Tagalog',
    placeholder: 'Mag-type ng mensahe',
    sendLabel: 'Ipadala',
    typing: 'Nag-iisip si Aikus...',
    error: 'Hindi ko maabot ang aking isip sa ngayon. Pakisuri na tumatakbo ang helper program.',
    lastReply: 'Huling sagot:',
    emergencyButtonLabel: 'Emergency Call 911',
    emergencyCallLabel: 'Tumawag sa 911',
    emergencyHelpMessage: 'Kailangan po ba ninyo ng tulong? Tumawag sa 911.',
    emergencyConfirmationTitle: 'Tatawag po ba sa 911?',
    emergencyConfirmationMessage: 'Gusto po ba ninyong tumawag sa serbisyong pang-emergency ngayon?',
    emergencyCancelLabel: 'Huwag muna',
    emergencyConfirmLabel: 'Tumawag na',
    emergencyCallError: 'Hindi mabuksan ang app para tumawag.',
    readAloudLabel: 'Basahin nang malakas',
    stopSpeechLabel: 'Itigil',
    voiceUnavailable: 'Walang boses para sa wikang ito.',
  });
});

test('Gemma model uses the configured generation options', () => {
  assert.equal(MODEL_NAME, 'gemma3:4b');
  assert.deepEqual(OLLAMA_OPTIONS, {
    temperature: 0.4,
    top_p: 0.9,
    num_predict: 120,
  });
});

test('Tagalog examples are sent as user/assistant pairs after the system prompt', () => {
  const liveMessages = [{ role: 'user' as const, content: 'Kumusta po kayo?' }];
  const payload = buildPromptMessages(liveMessages, 'tl');

  assert.equal(payload[0]?.role, 'system');
  assert.equal(payload[0]?.content, TAGALOG_SYSTEM_PROMPT);
  assert.deepEqual(payload.slice(1, 1 + TAGALOG_EXAMPLES.length), TAGALOG_EXAMPLES);
  assert.deepEqual(payload.slice(-1), liveMessages);
  assert.equal(TAGALOG_EXAMPLES.length, 20);
  for (let index = 0; index < TAGALOG_EXAMPLES.length; index += 2) {
    assert.equal(TAGALOG_EXAMPLES[index]?.role, 'user');
    assert.equal(TAGALOG_EXAMPLES[index + 1]?.role, 'assistant');
  }
});

test('markdown formatting is removed from replies', () => {
  assert.equal(
    stripMarkdown('# **Hello** `there`!\n- First item\n2. Second item'),
    'Hello there!\nFirst item\nSecond item',
  );
});

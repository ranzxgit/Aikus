import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getChatGreeting, isSendDisabled, shouldShowQuickReplies, shouldSubmitOnEnter } from './chatPresentation.ts';
import { getHealthNote } from './healthSafety.ts';
import {
  CHAT_LIST_BOTTOM_PADDING,
  COMPACT_EMERGENCY_BUTTON_HEIGHT,
  EMERGENCY_BUTTON_HEIGHT,
} from '../theme/layoutMetrics.ts';

test('quick replies are shown only while the chat is empty', () => {
  assert.equal(shouldShowQuickReplies([]), true);
  assert.equal(shouldShowQuickReplies([{ id: 'welcome-message', role: 'assistant', content: 'Welcome', createdAt: 1 }]), true);
  assert.equal(shouldShowQuickReplies([{ id: '1', role: 'user', content: 'Hi', createdAt: 1 }]), false);
});

test('send is disabled when the draft is empty or a reply is in progress', () => {
  assert.equal(isSendDisabled('', false), true);
  assert.equal(isSendDisabled('  ', false), true);
  assert.equal(isSendDisabled('Hello', false), false);
  assert.equal(isSendDisabled('Hello', true), true);
});

test('Enter submits and Shift+Enter inserts a newline', () => {
  assert.equal(shouldSubmitOnEnter('Enter', false), true);
  assert.equal(shouldSubmitOnEnter('Enter', true), false);
  assert.equal(shouldSubmitOnEnter('a', false), false);
});

test('greeting follows the selected language', () => {
  assert.equal(getChatGreeting('en'), "Hello! I'm Aikus. How are you today?");
  assert.equal(getChatGreeting('tl'), 'Magandang araw po! Ako si Aikus. Kumusta kayo ngayon?');
});

test('message list reserves enough space for the Emergency button', async () => {
  assert.ok(CHAT_LIST_BOTTOM_PADDING >= EMERGENCY_BUTTON_HEIGHT);
  assert.equal(COMPACT_EMERGENCY_BUTTON_HEIGHT, 48);

  const chatSource = await readFile(new URL('../app/(app)/chat.tsx', import.meta.url), 'utf8');
  assert.match(chatSource, /paddingBottom:\s*CHAT_LIST_BOTTOM_PADDING/);
  assert.match(chatSource, /height < 700 \|\| inputFocused/);
});

test('chat sends replies and renders medical notes using the selected language', async () => {
  assert.equal(getHealthNote('en'), 'Aikus is not a doctor. For medical help, please see a doctor.');
  assert.equal(getHealthNote('tl'), 'Hindi doktor si Aikus. Para sa tulong medikal, magpatingin po sa doktor.');

  const chatSource = await readFile(new URL('../app/(app)/chat.tsx', import.meta.url), 'utf8');
  assert.match(chatSource, /askAikus\(safeContext,\s*selectedLanguage,/);
  assert.match(chatSource, /getHealthNote\(selectedLanguage\)/);
  assert.match(chatSource, /CHAT_UI_TEXT\[selectedLanguage\]/);
  assert.match(chatSource, /FLOW_TEXT\[selectedLanguage\]\.callNow/);
});

test('Chat and shared layout provide exactly one non-overlapping Emergency button', async () => {
  const chatSource = await readFile(new URL('../app/(app)/chat.tsx', import.meta.url), 'utf8');
  const layoutSource = await readFile(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

  assert.equal((chatSource.match(/<EmergencyButton\b/g) ?? []).length, 1);
  assert.match(layoutSource, /!isHomeRoute && !isChatRoute/);
  assert.match(layoutSource, /flowEmergencyDock/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { getChatGreeting, isSendDisabled, shouldShowQuickReplies, shouldSubmitOnEnter } from './chatPresentation.ts';

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

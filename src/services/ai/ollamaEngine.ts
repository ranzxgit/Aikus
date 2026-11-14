import {
  MODEL_NAME,
  OLLAMA_BASE_URL,
  OLLAMA_OPTIONS,
  type SupportedLanguage,
} from '@/config';
import type { ChatMessage } from '@/types/chat';
import { stripMarkdown } from './replyFormatting';
import { readOllamaStream } from './ollamaStream';
import { buildPromptMessages } from './prompts';

export { stripMarkdown } from './replyFormatting';

export function trimChatContext(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => message.content.trim().length > 0).slice(-10);
}

export async function askWithOllama(
  messages: ChatMessage[],
  language: SupportedLanguage = 'en',
  onToken?: (token: string) => void,
): Promise<string> {
  const context = trimChatContext(messages);
  const payloadMessages = buildPromptMessages(context, language);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      stream: true,
      messages: payloadMessages,
      options: OLLAMA_OPTIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Ollama response body is unavailable');
  }

  let fullReply = '';
  await readOllamaStream(response.body, (content) => {
    fullReply += content;
    onToken?.(stripMarkdown(fullReply));
  });

  return stripMarkdown(fullReply) || 'I am here and ready to help.';
}

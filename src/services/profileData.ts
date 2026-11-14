import type { ChatMessage } from '@/types/chat';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

function chatKey(profileId: string): string {
  return `aikus.profile.${profileId}.chat`;
}

export function createProfileDataStore(storage: KeyValueStorage) {
  return {
    async loadChat(profileId: string): Promise<ChatMessage[]> {
      const serialized = await storage.getItem(chatKey(profileId));
      if (!serialized) return [];
      try {
        const value: unknown = JSON.parse(serialized);
        return Array.isArray(value) ? value as ChatMessage[] : [];
      } catch {
        return [];
      }
    },
    saveChat(profileId: string, messages: ChatMessage[]): Promise<void> {
      return storage.setItem(chatKey(profileId), JSON.stringify(messages));
    },
    clearChat(profileId: string): Promise<void> {
      return storage.setItem(chatKey(profileId), JSON.stringify([]));
    },
    async removeChat(profileId: string): Promise<void> {
      if (storage.removeItem) await storage.removeItem(chatKey(profileId));
      else await storage.setItem(chatKey(profileId), JSON.stringify([]));
    },
  };
}

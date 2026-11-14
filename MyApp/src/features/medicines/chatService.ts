import { createMedicineAnswerer, removeMedicineExchangeFromAiContext } from './chat';
import { medicineRepository } from './storage';
import type { ChatMessage } from '@/types/chat';

export const answerMedicineQuestion = createMedicineAnswerer(medicineRepository.getMedicines);

export async function getMedicineSafeAiContext(profileId: string, messages: readonly ChatMessage[]): Promise<ChatMessage[]> {
  const medicines = await medicineRepository.getMedicines(profileId);
  return removeMedicineExchangeFromAiContext(messages, medicines.map((medicine) => medicine.name));
}

export interface PinAttemptState {
  wrongAttempts: number;
  lockedUntil: number | null;
}

export type PinAttemptResult = PinAttemptState & { locked: boolean; remainingAttempts: number };

export function recordWrongPin(
  state: PinAttemptState,
  now: number,
): PinAttemptResult {
  if (state.lockedUntil !== null && now < state.lockedUntil) {
    return {
      ...state,
      locked: true,
      remainingAttempts: 0,
    };
  }

  const wrongAttempts = state.lockedUntil !== null ? 1 : state.wrongAttempts + 1;
  const lockedUntil = wrongAttempts >= 5 ? now + 30_000 : null;
  return {
    wrongAttempts: lockedUntil === null ? wrongAttempts : 0,
    lockedUntil,
    locked: lockedUntil !== null,
    remainingAttempts: lockedUntil === null ? 5 - wrongAttempts : 0,
  };
}

# AIKUS: Local AI Companion for the Elderly (Web First, Then Android)

## 1. Goal

Rebuild "Aikus" (originally made in MIT App Inventor) as an Expo (React Native) app.

- A friendly chatbot that talks with elderly users like a friend and eases loneliness.
- A "Nearest Hospital" feature with call and directions buttons.
- A big, always-visible emergency button.
- **No cloud AI.** The language model runs locally. No API keys, no analytics, no backend of our own.

## 2. Delivery order (do not skip ahead)

1. **Stage A: Web.** Run in the browser with `npx expo start --web`. The AI is Ollama on this laptop.
2. **Stage B: Android with Expo Go.** Same code, same Ollama, reached over the local Wi-Fi.
3. **Stage C: Android dev build with the model inside the phone.** Use `llama.rn` and a small GGUF model. Expo Go cannot do this step.

Every feature must work on web before it is attempted on Android.

## 3. Stack

- Expo (latest stable SDK), Expo Router, TypeScript with `strict` on, pnpm or npm.
- Styling: StyleSheet or NativeWind. Animation: `react-native-reanimated` and `lottie-react-native`.
- Speech output: `expo-speech`. Location: `expo-location`. Links and calls: `expo-linking`.
- Storage: `@react-native-async-storage/async-storage` for chat history and settings (keep it simple for the first version).
- Do not add a backend, a database server, Docker, or any cloud SDK.

## 4. Platform abstraction (the key design rule)

Screens never call an AI library directly. They call one function:

```ts
// src/services/ai/index.ts
export async function askAikus(messages: ChatMessage[], language: SupportedLanguage, onToken?: (t: string) => void): Promise<string>
```

- **Web, and Android in Stage B:** `ollamaEngine.ts` calls `POST {BASE_URL}/api/chat` (model `gemma3:4b`, stream true).
- **Android in Stage C:** `llamaRnEngine.ts` uses `llama.rn` with a downloaded GGUF model.
- `Platform.OS` and a setting in `src/config.ts` choose the engine. Switching engines must not touch any screen.

`src/config.ts` holds:

```ts
export const OLLAMA_BASE_URL = "http://localhost:11434"; // web
// Real phone on same Wi-Fi: "http://<LAPTOP-LAN-IP>:11434"
// Android emulator:         "http://10.0.2.2:11434"
export const MODEL_NAME = "gemma3:4b";
```

## 5. Screens

1. **Home:** two very large buttons ("Talk to Aikus", "Nearest Hospital") and a red "Emergency Call 911" button (Philippines emergency number: 911).
2. **Chat:** message bubbles, text 20px or larger, high contrast, typing indicator, streaming replies, "Read aloud" toggle, and an animated avatar that moves gently while Aikus replies.
3. **Hospitals:** nearest first, each card shows name, distance, a Call button and a Directions button.

## 6. Chatbot behavior

System prompts:

- Keep the English and Tagalog prompts short. Replies must be 1 to 3 short sentences, with at most one question, and plain text only (no bullets, numbered lists, bold, headings, or emojis).
- Respond only to what the person said; never invent problems, symptoms, or events.
- Never diagnose or recommend medicine, doses, or treatments. For pain or illness, show warm concern and gently suggest telling family or a doctor.
- Do not mention 911 or emergencies in the model prompts; the code keyword check handles those.
- In Tagalog, always use "po" and "opo" and simple everyday words.
- Include examples for greetings, feeling sad, "I ate", and pain in both languages.
- Send Ollama options `temperature: 0.5`, `top_p: 0.9`, and `num_predict: 120`. Do not send a `think` option for Gemma.
- Strip Markdown symbols from every model reply before displaying it or reading it aloud.

Rules:

- Keep only the last 10 messages as context.
- Add a simple keyword check on the user's message (chest pain, fell, can't breathe, emergency, tulong, atake) that shows the emergency call button immediately, without waiting for the model.
- If the server or model is unreachable, show a gentle message: "I can't reach my brain right now. Please check that the helper program is running." Do not show stack traces.
- The app is a companion. It is not a medical device and must not present itself as one.
- The chat supports English and Tagalog with a toggle. Each language has its own system prompt and UI strings. Read-aloud uses en-US or fil-PH with a graceful fallback if the voice is missing. Emergency keywords must be checked in both languages.

## 7. Hospital finder

- Bundle `src/data/hospitals.json` with: `name`, `lat`, `lng`, `phone`, `address`. Fill it with hospitals for the area the user chooses.
- Get position with `expo-location`. Sort by haversine distance.
- If location is denied or unavailable, show the full list alphabetically and a clear message. Never block the screen.
- Call button: `Linking.openURL("tel:...")`.
- Directions button: `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`.
- Works with no internet for the list and distance. Directions need a maps app.
- Note: on web, geolocation only works on `localhost` or HTTPS.

## 8. Elderly-friendly UI rules

- Minimum font 18px (chat 20px+), touch targets at least 56px, high contrast, few screens.
- Motion is slow and gentle. No flashing, no fast transitions. Respect reduced-motion settings.
- Plain words, no jargon. One clear action per screen.
- Support the system font size setting. Add TalkBack and screen reader labels to every button.
- Destructive actions (clear chat history) need a confirmation.

## 9. Phases

Work one phase at a time. After each phase, run the checks and tell me what passed and what did not. Do not generate the whole app at once.

- **Phase 0:** Create the project, folder layout, `config.ts`, theme. Run on web.
- **Phase 1:** Chat screen with the Ollama engine on web, including streaming and error states.
- **Phase 2:** Senior-friendly styling, read-aloud, emergency button and keyword check.
- **Phase 3:** Hospitals screen with bundled JSON, location, call and directions.
- **Phase 4:** Avatar animation (Lottie or Reanimated) tied to the "typing/speaking" state.
- **Phase 5:** Stage B. Run in Expo Go on an Android phone using the laptop's Ollama over Wi-Fi.
- **Phase 6:** Stage C. `expo prebuild`, add `llama.rn`, build a dev build, model download screen (Wi-Fi once, with size and checksum verification), run fully offline.
- **Phase 7:** Polish, real-device testing, airplane mode test, README.

## 10. Android notes (for Stages B and C)

- Phone and laptop must be on the same Wi-Fi. Allow port 11434 through the laptop firewall.
- Ollama must listen on the network: `OLLAMA_HOST=0.0.0.0` and `OLLAMA_ORIGINS=*`, then restart it.
- Release builds block plain `http://` by default. Allow it for local testing with `expo-build-properties` (`usesCleartextTraffic: true`) in dev builds only. The final offline build does not need network calls at all.
- Do not bundle the model in the APK. Download it on first launch into app storage, verify size and SHA-256, and show progress.
- Start with a 1B or 1.5B quantized model (Q4). Use 3B only on phones with 6 GB RAM or more.
- Expo Go cannot load `llama.rn`. Use `npx expo run:android` or `eas build --profile development`.
- Keep `android/` generated and out of git.

## 11. Coding rules

- TypeScript strict. No `any` unless justified in a comment.
- Business logic stays out of screens. Screens call services.
- Handle loading, empty, and error states on every screen.
- Do not log chat content.
- Do not commit model files, secrets, or personal data.
- Do not claim a feature works until it has been run. Report the commands you actually ran and their results.
- Add small unit tests for: haversine distance and sorting, the emergency keyword check, and chat context trimming.

## 12. Definition of done

- Chat works on web with Ollama, with streaming replies.
- Same code runs in Expo Go on Android over Wi-Fi.
- Hospitals list sorts by distance and call/directions work.
- Emergency button is visible on every screen.
- Stage C: the chat works in airplane mode using the on-device model.
- README documents setup, run, and troubleshooting steps that were actually tested.

## 13. First task

Start with Phase 0 only. Create the Expo project, set up the folder structure and `config.ts`, confirm it runs with `npx expo start --web`, and show me the result and the Phase 1 plan before continuing.

NOTE: This project is currently under development

# Aikus
<img width="1024" height="1024" alt="app-icon" src="https://github.com/user-attachments/assets/3348274c-0340-461f-828b-6bcfd78a55c5" />


## Run on web

Install packages with npm install, then start the web app with:

    npx expo start --web

The app opens to a loading screen. On first launch, choose English or Tagalog, then add a local profile or continue with the local Guest profile. Profiles can use an optional four-digit PIN. Select a profile and continue to Home. Returning launches restore the active profile and its language.

In development, append `?motion=on` to the web URL to preview the full splash animation even when reduced motion is enabled. Settings includes an Animations choice for On, Off, or Follows system.

## App flow and local data

- Expo Router groups separate language choice, profile selection, PIN entry, and profile management from Home, chat, hospitals, and Settings.
- Profile names, language, settings, and each profile's chat history are stored locally. There is no app backend or cloud account.
- PINs are never stored as plain text. A per-profile random salt and SHA-256 hash are saved with SecureStore on Android/iOS and AsyncStorage on web. A four-digit PIN is basic protection, not strong security.
- Deleting a profile also removes its PIN credential, settings, and chat history. Settings asks for confirmation before clearing history or deleting a named profile.
- The loading screen checks GET /api/tags on the configured Ollama URL for up to three seconds. If it cannot connect, Home displays a dismissible notice and retry action. The chat still reports its normal local-helper connection error when a message is sent.
- The global red 911 button stays visible across the loading, language, profile, PIN, Home, chat, hospital, and Settings screens.

## Checks

Type-check the project with npx tsc --noEmit.

Run the app flow tests with node --test src/services/appFlow.test.mts.

For Ollama-backed chat, run Ollama locally and keep OLLAMA_BASE_URL in src/config.ts pointed at the local service. Web geolocation requires localhost or HTTPS.

## Android status

Phase 5 is paused. The app flow is prepared for local web testing; the Android Expo Go flow has not been started or tested.

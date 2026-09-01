# Carcassonne Scoring App: Agent Context & Project SSOT

This document is the **Single Source of Truth (SSOT)** for the Carcassonne Scoring project. It contains granular details regarding the architecture, design philosophy, specific bug fixes, and unresolved tasks. **Any AI agent interacting with this project should read this document first to fully understand the project's state and history.**

---

## 🎯 1. Core Objective
A highly polished, offline-first mobile utility to track scores for the board game Carcassonne. It replaces pen and paper. 
**Key Requirements:**
- **No-Scroll Guarantee:** The main scoring screen must fit up to 6 players on *any* phone screen without requiring vertical scrolling.
- **Premium Feel:** Must use fluid animations, high-quality assets, and intuitive UI to feel like an official companion app.
- **Global Reach:** Fully localized in 8 languages, including Store metadata.

---

## 🛠 2. Tech Stack & Dependencies
- **Framework:** React Native (via Expo managed workflow).
- **Styling:** Tailwind CSS (via NativeWind).
- **Animations:** React Native Reanimated (used extensively for score popups and screen transitions).
- **Image Rendering:** Expo Image (`expo-image`) for heavy asset caching.
- **Safe Area Management:** `react-native-safe-area-context`.
- **Localization:** `expo-localization` & `i18n-js`.
- **Build Pipeline:** Expo Application Services (EAS).

---

## 📂 3. Directory & File Architecture
The project is lean, keeping most business logic unified.

### Core Files:
*   **`src/App.tsx`**: The core engine. It acts as the router, state manager, and layout calculator. It contains the logic for scaling, score calculation, history logging, and all screen UI.
*   **`src/components/Meeple.tsx`**: A dedicated component for rendering the player avatar (Meeple). It handles the specific color-to-asset mapping.
*   **`src/i18n/index.ts`** & **`src/i18n/*.json`**: Contains the localization setup and translations for English, German, French, Spanish, Ukrainian, Russian, Japanese, and Chinese.
*   **`app.json`**: Expo configuration. Note: `ios.buildNumber` is omitted so EAS can manage versioning remotely. `"supportsTablet": true` is enabled.
*   **`eas.json`**: EAS build profiles (configured for production store distribution).

### Root Artifacts (For Store Submission):
*   **`PRIVACY_*.md`**: Localized privacy policies (No data collection).
*   **`Metadata_*.md`**: Localized App Store metadata (Titles, Subtitles, Descriptions, Keywords).
*   **`artifacts/Combined store_metadata v2.json`**: Raw JSON backup of all store translations.

---

## 🧠 4. Critical Technical Decisions & Bug Fixes
*Pay close attention to these, as attempting to "refactor" them without understanding will reintroduce bugs.*

### A. The "No-Scroll" Dynamic Layout Engine
Instead of media queries, `src/App.tsx` uses a custom `getLayoutConfig()` function. 
- It uses the iPhone 15 Pro Max (`839px` safe height) as the baseline.
- It calculates a `scale` multiplier: `currentSafeHeight / 839`.
- **Every UI element** (font sizes, padding, margins, icon sizes) is multiplied by this `scale`.
- **Limits:** `Math.max()` is used to enforce minimum legibility bounds on small phones (e.g., fonts don't drop below 15px).
- **Tablet Moderation:** If the screen is *larger* than the baseline (iPads), the scale uses a `tabletModeration = 0.5` factor. Elements grow, but only half as fast, preventing comical oversizing. Horizontal margins are aggressively increased on tablets.

### B. The Android ScrollView Flex Bug
In `App.tsx`, the `ScrollView` mapping the player cards uses `contentContainerStyle={{ flexGrow: 1 }}`. 
- **The Bug:** Android incorrectly calculates layout bounds if `paddingBottom` is applied to a flex-grow container, pushing the 6th player card behind the hardware navigation buttons.
- **The Fix:** Removed `paddingBottom` from the container. Instead, an absolute `<View style={{ height: insets.bottom + extraPadding }} />` is injected at the very bottom of the player list to physically force the space.

### C. Meeple Icon Caching Bug
In `src/components/Meeple.tsx`, swapping a player's color on the Start Screen caused the UI text to update, but the image remained the old color.
- **The Cause:** React Native's aggressive native-view recycling was reusing the image view without respecting the prop change quickly enough.
- **The Fix:** The `<Image>` component is passed `key={color}`. This forces React to unmount the old view and mount a completely fresh native view instance whenever the color changes.

### D. The Score Aggregation Loop
To prevent chaotic UI updates when a user rapid-fires a button (e.g., tapping "+1" five times), we use `tempScores`. 
- Taps immediately update the `tempScores` state.
- A Reanimated view pops up displaying "+5".
- A timeout (`scoreTimeout`, customizable in Settings) waits for the user to stop tapping.
- Once the timeout clears, the aggregated `tempScores` are flushed, applied to the player's true total, and a single clean `HistoryEntry` is written to the log.

---

## 🗃 5. State & Data Structures (Defined in `App.tsx`)

*   **`Screen` State:** `type Screen = 'start' | 'scoring' | 'loading' | 'history' | 'settings';` (Custom lightweight router).
*   **`Player` Entity:** 
    ```typescript
    { id: number, name: string, color: string, image: any }
    ```
*   **`HistoryEntry` Entity:** 
    ```typescript
    { id: string, playerId: number, playerName: string, change: number, newScore: number, timestamp: number }
    ```

---

## 🚀 6. Deployment Status & Unresolved Tasks

### iOS (App Store Connect)
- **Status:** Initial `.ipa` build is uploaded to TestFlight/App Store Connect.
- **Blocking Issues (TO DO):**
  1. **iPad 13-inch Screenshots:** Must upload 2048x2732 px screenshots to the version 1.0 dashboard.
  2. **App Privacy:** The Admin must fill out the Data Collection questionnaire (Answer: "No data collected") and Publish it.
  3. **Pricing:** Must select a Price Tier (e.g., "Free").
  4. Once these three are done, the "Add for Review" button will become available.

### Android (Google Play Console)
- **Status:** Pending build.
- **TO DO:**
  1. Run `eas build --platform android --profile production` to generate the `.aab` file.
  2. Create the app listing in Google Play Console.
  3. Upload the `.aab` and paste the localized metadata.

### Future Enhancements (Backlog)
- **State Persistence:** Currently, if the OS kills the app, the game is lost. Implement `AsyncStorage` to save/restore the `players`, `history`, and active `Screen` state.
- **Undo Button:** A quick undo action directly on the scoring screen to reverse the very last action without needing to read the history log.

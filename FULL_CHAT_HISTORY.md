# Session History: Carcassonne Scoring Optimization & App Store Deployment

This document serves as a comprehensive chronological summary of the decisions, bug fixes, and deployment steps taken during this development session.

---

## 1. UI/UX Optimization & Responsive Scaling

**Objective:** The app needed a robust, truly responsive layout that guaranteed 6 player cards would fit on any screen without scrolling, while maintaining legibility.

*   **The iPhone 15 Baseline:** We moved away from hardcoded pixel "buckets" and implemented a mathematical scaling engine in `App.tsx`. It uses the iPhone 15 Pro Max (839px safe height) as the "Gold Standard". All UI elements (fonts, padding, margins, icon sizes) dynamically multiply by a `scale` ratio derived from the device's actual safe height.
*   **Android Navigation Overflow Bug:** The user reported the 6th player (Gray) overflowing behind the Android hardware navigation buttons. 
    *   **Diagnosis:** React Native's Android `ScrollView` calculates `flexGrow` incorrectly when `paddingBottom` is applied to the `contentContainerStyle`.
    *   **Solution:** We removed the padding and injected a literal `<View style={{ height: ... }}>` spacer at the bottom of the player list to physically enforce the safe area padding.
*   **Typography Squeezing:** We removed the hardcoded `minHeight` on the adjustment buttons and increased the minimum `btnFontSize` cap, resulting in much tighter, highly legible buttons that perfectly wrapped the text.
*   **Tablet Refactor:** We removed the strict `1.0` scale cap and implemented "Moderate Scaling" for tablets (e.g., iPads). Elements now scale up with a `0.5` moderation factor, and horizontal margins increase for wider screens, preventing the app from looking like a stretched phone interface.

## 2. Component Bug Fixes

**Objective:** Fix visual bugs during gameplay setup.

*   **Meeple Color Swap Bug:** When switching player colors on the Start Screen, the color name would update but the image would occasionally not change.
    *   **Diagnosis:** Native view recycling/caching latency with the `expo-image` library.
    *   **Solution:** Passed a unique `key={color}` to the `<Image>` component in `Meeple.tsx`, forcing React to cleanly unmount and remount a fresh native view instance, entirely bypassing the native cache.

## 3. Expo & App Store Connect Preparation

**Objective:** Prepare the codebase and Apple Developer portal for a Version 1.0 release.

*   **EAS Build Configuration:** Cleaned up `app.json` by removing `ios.buildNumber` (allowing EAS to manage it remotely) and confirming `"supportsTablet": true`.
*   **Apple PLA Block:** The initial `eas build --platform ios` command failed with an `Apple 403` error. This was diagnosed as a pending Program License Agreement (PLA) that the user needed to accept manually in the Apple Developer Portal.
*   **App Store Icon Placeholder:** The user noticed a wireframe grid instead of the red meeple icon in App Store Connect. We diagnosed this as standard Apple processing time (and verified the icon had no alpha transparency issues).
*   **Marketing Screenshots:** Discussed the importance of premium marketing mockups over raw screenshots. Provided advice on using tools like Hotpot.ai to frame the screenshots, especially for the strict 13-inch iPad requirements.
*   **App Naming:** Navigated App Store naming conflicts. We shifted from the generic "Carcassonne Scoring" to more robust options like "Carcassonne Score Tracker" and ultimately "Carcassonne Score & Log" to secure a unique global name while retaining ASO keywords.

## 4. Documentation & Localization Generation

**Objective:** Create the required legal and marketing text for global distribution.

*   **App Store Metadata:** Generated localized Titles, Subtitles, Descriptions, and Keywords for 8 languages (English, German, French, Spanish, Ukrainian, Russian, Japanese, Chinese). Saved these to dedicated `Metadata_*.md` files in the project root.
*   **Privacy Policy:** Created and translated `PRIVACY.md` into all 6 requested non-English languages to fulfill Apple's strict privacy policy requirements (confirming no data collection).
*   **Submission Checklist:** Built a step-by-step artifact checklist (`app_store_submission_checklist.md`) guiding the user through the final App Store Connect hurdles (iPad screenshots, App Privacy questionnaire, Pricing tier).
*   **Project Context (SSOT):** Rewrote the `README.md` for a clean public face, and generated a massive, granular `CONTEXT.md` file to act as the Single Source of Truth for future AI agents to understand the project architecture, layout math, and deployment status.

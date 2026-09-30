# Omalt

*Start blank. Become yours.*

Omalt is a self-building journal. It opens on an almost empty canvas: the wordmark and one text box. As you write, a (mock) AI notices patterns such as tasks and moods, and offers to grow the canvas with modules that fit how you actually use it.

This is **Phase 1**: it proves the core loop end to end, entirely on-device.

## Run it in Expo Go

Requirements: Node 20+, and the **Expo Go** app on your phone (iOS App Store / Google Play) updated to a version that supports **SDK 57**.

```bash
cd omalt
npm install        # .npmrc sets legacy-peer-deps, needed for Expo's optional react-dom peer
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). If your phone and computer are on different networks, use `npx expo start --tunnel`.

Other commands:

```bash
npx tsc --noEmit                                   # typecheck (strict mode)
npx expo export --platform android --output-dir /tmp/omalt-export   # confirm the bundle builds
```

Only Expo Go-bundled native modules are used (`expo-sqlite`, `expo-font`, `expo-splash-screen`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`). No development build is needed.

## Try the core loop

1. Write entries such as *"I need to call the dentist"*, *"I have to pay rent and I must email Sam"*, or *"todo: buy milk"*.
2. After **3 task mentions** a card appears under the text box: *"You mentioned tasks 3 times. Would a to-do list help?"* Tap **Add**; a To-do card appears near the centre on a dotted trail, and the canvas pans to show it.
3. Tap the card to open its dashboard: progress, tickable tasks pulled from your entries, and an add-task field. Go back and the canvas is exactly where you left it.
4. Write something like *"I'm feeling great today"* (or *"feeling tired"*). A **Mood** suggestion appears after a single mention. Add it, then open it to log with the five-button "how are you today" row and see the weekly chart and average.
5. **Settings** has the *Plain list view* toggle (a linear alternative to the canvas; it turns on by default if a screen reader is running on first launch) and *Erase all data*.

The mock detects tasks from *need to, have to, must, got to, gotta, remember to, don't forget to, todo*. Moods come from a small word list (with simple negation, e.g. "not good") and only count in a feeling context ("I feel...", "I'm...", or a very short entry).

## Project layout

```
app.config.ts          Expo config (placeholder bundle id / package name)
eas.json               development, preview, production build profiles
src/
  app/                 Expo Router screens
    _layout.tsx          fonts, DB init, splash, gesture root, stack
    index.tsx            canvas (or plain list view)
    module/[id].tsx      opens a module's dashboard
    settings.tsx
  theme/               design tokens: colours, type, radii, shadows (no hard-coded colours elsewhere)
  db/                  expo-sqlite: schema.ts (SQL + Zod rows), database.ts (open/migrate), repo.ts (queries)
  ai/                  AIService interface + MockAIService (keyword rules). No API keys.
  store/               Zustand store, suggestion reconciliation
  canvas/              Canvas, CanvasCard, Trail, MiniMap, spiral layout + constants
  components/          Composer, SuggestionPrompt, ListView, shared UI
  modules/
    todo/  mood/  generic/   each: Card, Dashboard, schema.ts, index.ts
    registry.ts              type -> module definition (unknown types fall back to generic)
```

### Adding a module type

Create `src/modules/<type>/` with `<Type>Card.tsx`, `<Type>Dashboard.tsx`, `schema.ts` and `index.ts` exporting a `ModuleDefinition`, then register it in `registry.ts` and `meta.ts`. Swap `aiService` in `src/ai/index.ts` to change how suggestions are produced.

## Design notes

- **World**: 6000 x 6000 pt, centred on the text box (3000, 3000). Card `x`/`y` are world-space card centres stored in the `modules` table.
- **Spawning**: new cards walk an Archimedean spiral out from the centre and take the first slot that clears the text-box cluster and every existing card.
- **Pan**: `Gesture.Pan` (6 pt activation distance) with `withDecay` (native-like deceleration; harder flicks get a small velocity boost, capped), clamped to the world. Viewport culling lives in its own `WorldContent` subtree so re-renders never touch the gesture layer. Cards are `Pressable`s, so a short tap opens a card, a drag activates the pan and cancels the press, and a press that coincides with canvas movement is ignored.
- **Culling**: the viewport is quantised to a 200 pt grid; the visible card, trail and ambient-dot set is recomputed only when the viewport crosses a cell, with a 400 pt margin.
- **Ambient dots**: a deterministic scatter of sand and sage dots covers the whole world (generated per grid cell, nothing stored), so cards, trails and notes sit in one connected field.
- **Thought notes**: your last five entries float up from the wordmark as small notes joined by a dotted chain, newest closest and fading with age. Tap one to expand it. The plain list view shows the same entries under "Recent thoughts".
- **Growth hint**: under the text box, whenever there is no suggestion to act on, the canvas says "Keep writing, and Omalt will suggest what to add here."
- **Persistence**: entries, extracted items, modules and suggestions are in SQLite (`omalt.db`). A small extra `kv` table stores the last pan position (as the world point at the viewport centre) and settings.
- **Suggestions**: one per module type. "Not now" snoozes it until enough new mentions accumulate (3 more for tasks, 5 more for mood).
- **Accessibility**: labelled controls, 44 pt touch targets, Dynamic Type honoured (capped on fixed-size canvas cards), text-safe sage/sand shades for contrast, and the plain list view.

## Building with EAS

`app.config.ts` uses placeholder identifiers (`com.example.omalt`). Change them first, then:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile preview --platform android
```

Profiles in `eas.json`: `development` (debug build, internal), `preview` (internal APK), `production` (store, auto-increment). The `development` profile is a plain debug build; if you want a dev client, install `expo-dev-client` and set `"developmentClient": true`.

## Out of scope for Phase 1

Health sync, widgets, voice entry, fading and the Resting drawer, generated modules, real AI, cloud sync, payments.

## Known limitations

- The default icon and splash images are the Expo template placeholders.
- Cards are placed automatically and their positions persist, but they can't yet be dragged to a new spot.
- Verified with a TypeScript strict typecheck, a Metro bundle, and unit-style runs of the mock AI, spiral layout and suggestion logic. Gesture feel (pan momentum, tap vs drag, keyboard nudging) needs a check on a real device in Expo Go.

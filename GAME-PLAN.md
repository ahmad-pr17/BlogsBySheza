# Blog Game Mode — Status

The homepage is a full-screen, vertical, pixel-art game. A character walks a winding dirt trail; each blog post is a sign on the trail. Walk up and press Enter (or tap the sign) to read it in a modal. Everything else on the site (`/blog/[slug]`, comments, reactions, admin, music player) is unchanged.

## What exists
- **Engine** (`src/components/game/`): canvas renderer at integer pixel scale (2x phone / 3x laptop / 4x large), tile collision, 8-direction movement, depth-sorted sprites, camera that follows the player.
  - `GameWorld.tsx` game loop, input, HUD, joystick
  - `world.ts` trail layout, free spaces, scenery, collision grid, interactables
  - `ground.ts` grass autotile layer (rounded edges over dirt/water)
  - `art.ts` loads sprites from `public/game/`; draws signs, jukebox, mailbox, lamp
  - `PostModal.tsx` post / subscribe overlay
- **Interactions:** post signs (read), and three camp buildings at the start: About house, Jukebox (Song) and Admin house, all opening as popups like a post (`/?page=about|song|admin` deep links; the Admin popup frames `/admin`, so its login works unchanged). The mailbox (subscribe form) sits at the end of the trail. "!" marks unread posts; read state is kept in localStorage (`trail-read`). `/about`, `/song` and `/admin` still work as normal pages.
- **Town:** the start is a town. Five houses stand along a street facing a dirt square with the campfire, benches, lamps and jukebox: two decorative houses plus About, Home (blue) and Admin. Auto-walk finds a path around obstacles (`planRoute` in `world.ts`).
- **Home** (`home.ts`, `homeArt.ts`): walk into the Home to enter a one-room cottage (fade in and out). Cook at the stove (3-second animation, then a random dish appears on the table), eat it at the table, pet the cat, browse the bookshelf, or sleep in the bed (fade to black, flips the room between day and night). Night has moonlit windows and warm glows around the fire and lamps. Furniture is cut from the Sprout Lands Basic furniture sheet; the stove, counters, bookshelf, cat and dishes are drawn in code.
- **Entry screen and multiplayer** (`GameWorld.tsx`, `multiplayer.ts`, `/api/realtime/token`): the homepage opens on a game-style entry screen (always shown, except on direct post/page links; nothing is remembered between visits). Visitors choose a character (Farmer in yellow or sky blue, Bear, Bunny, Frog or Chicken; `characters.ts`, `animals.ts`), plus an optional name (14 characters; profanity and "admin"/"Sheza" are blocked, and names from other players are filtered the same way), then everyone online sees each other walking around, with names, emotes (4 quick ones on keys 1-4, 20 more in the 😊 panel) and body actions (dance, jump, spin on keys 5-7; walking cancels them; others see them) and an online counter. Realtime is Ably (channel `town`); the browser only gets short-lived tokens from `/api/realtime/token`, and `ABLY_API_KEY` stays server-side. Needs `ABLY_API_KEY` in the Vercel project env; without it the game runs solo.
- **Roles** (entry screen has three doors): **Visitor** (read, walk, chat, emotes), **Owner (Sheza)** (her admin password, `ADMIN_PASSWORD`; pink-shirt farmer with a flower crown named "Sheza"; can use the Admin house, the admin popup and the menu's Admin entry) and **Superadmin** (the developer; its own password, `SUPERADMIN_PASSWORD`; always the fox named "Fox" with a halo; also has admin access; can fly with F or the 🕊️ button (ignores obstacles, grows wings), speed boost (hold Shift or ⚡) and teleport by clicking the minimap). Visitors never see the Admin house (it is just a plain house for them), the menu's Admin entry, or the classic site's Admin link. Roles come from signed cookies (`sb_session` owner/admin, `sb_super` superadmin) and from the realtime token's clientId prefix (`owner:`, `admin:`, `v:`), so other players cannot fake them. The entry screen always asks; an old admin cookie never grants a role by itself. Logins are rate limited (5 wrong tries locks that address for 10 minutes).
- **Day and night** (`daynight.ts`; currently switched OFF with `DAY_NIGHT_ENABLED = false`, because the night look was not right yet): an 8-minute cycle that follows the wall clock, so everyone sees the same time. Dusk and night dim the world with a blue tint and light up the lamps and campfire; fireflies glow brighter; the Home windows show the same sky. Sleeping in the bed skips your own view ahead (night to morning, day to evening). The time of day shows under the title. With "reduce motion" on, it stays daytime and the fireflies are off.
- **Sign extras:** a ✨ on posts published in the last 7 days, and "📖N" on a sign while N people are reading that post. New arrivals broadcast/receive positions straight away (no 4 second wait).
- **Sound** (`sound.ts`): footsteps (grass vs wooden floor), clicks, emote pops, chat pings, doors, cooking sizzle, a chime for cooking and sleeping, and soft birdsong outdoors. All made in the browser (Web Audio), no audio files. 🔊 button or key M mutes; the choice is remembered.
- **Moderation:** the 👥 button lists who is online. Anyone can **Mute** a player (hides their chat and emotes for you only). Sheza and the superadmin also get **Silence 10 min**: the server (`/api/realtime/moderate`, owner/superadmin cookie required) publishes a silence under the reserved sender `server:mod`, and every player's browser ignores that person until it runs out; "Lift silence" undoes it. Visitors only (never Sheza or the fox). The word filter also catches leetspeak and stretched letters.
- **Home extras:** the stove opens a recipe book (bread and soup at first; pie after 2 meals, stew after 4). Cooking more upgrades the Home: at 2 meals a counter lamp and a plant, at 5 a second rug and a reading stool, at 9 a sunflower and a doormat rug. Progress is kept in this browser (`trail-home`).
- **Performance:** all small sprites are packed into one image (`public/game/atlas.png` + `atlas.json`, built by `python scripts/build-atlas.py`; rerun it after changing `public/game/sprites/`), so the game makes about 6 image requests instead of about 66.
- **Code layout:** `GameWorld.tsx` is the game loop and state. Screens and panels live beside it: `GateScreen.tsx` (entry screen), `HudBar.tsx` (chat, emojis, players, sound, admin buttons), `RecipeBook.tsx`, `HelpPanel.tsx`, `PostModal.tsx`, `Readers.tsx`. Art/world: `art.ts`, `animals.ts`, `homeArt.ts`, `palaceArt.ts`, `palace.ts`, `scenes.ts`, `world.ts`, `ground.ts`. Network: `multiplayer.ts`. Rules: `names.ts`, `characters.ts`, `daynight.ts`.
- **Tests:** `npm test` runs fast logic tests (names, chat rules, day/night). `npm run test:e2e` drives a real Chrome through the entry screen, roles, chat, emojis, sound, the players list, the Home and cooking, and the server routes (it blocks the realtime connection so no test players appear on the live town; the superadmin login test uses `SUPERADMIN_PASSWORD` from `.env` and is skipped without it). The first load of each page is slow in development, so a full run takes several minutes.
- **Chat:** a 💬 box (or press T) sends a short message (60 characters, no links, friendly-language filter, one per 1.5s) shown as a speech bubble to everyone online; messages from others are filtered the same way.
- **Readers:** a fox (left) and a bear (right) sit on the post card while you read (`Readers.tsx`, drawn in code). They glance at you, then turn back to the post; they blink, and stay still with reduced motion.
- **HUD:** always-visible minimap strip (whole trail, post markers, your position, current view) and a collapsible "How to play" corner (open by default on desktop, a "?" button on phones).
- **Free spaces** after each post, cycling: pond, campfire with benches, flower garden, fenced plot, picnic.
- **Controls:** WASD/arrows + Enter/E/Space, click or tap to walk, tap a sign to auto-walk to it, on-screen joystick on touch screens.
- **Fallbacks:** `/?view=list` shows the classic post list; every post is also a hidden plain link for crawlers and screen readers; `/?post=<slug>` deep-links to a post.

## The Palace (Nov 2026)
The old cottage is now a light-gold **palace** (golden glow on the windows, door and fairy lights outside). Rooms are separate scenes (`scenes.ts`: Great Hall = "home", kitchen, living, bedroom, study), laid out and painted in `palace.ts` with props in `palaceArt.ts`; each room is 20 x 15 tiles and doors/stairs link them (`go:<room>` actions).
- **Great Hall:** marble floor, red carpet, four guards (click one: they talk), grand double staircase up to the bedroom, throne (sit for a fanfare and a crown emote), arches to the kitchen and living room, swaying chandelier.
- **Kitchen:** stove and prep table open the recipe book; cooking is a step-by-step game (`CookingGame.tsx`, recipes in `RecipeBook.tsx`: bread, cookies, cupcakes, soup, pineapple tarts, ramen, berry pie, biryani, stew). Meals cooked still unlock cosier decor (`UNLOCK_AT`).
- **Living room:** TV (`TvModal.tsx`, original pixel-art "Remarried Empress" drama channel, fireplace, cooking show), piano (`PianoModal.tsx`), sofa, the cat.
- **Bedroom (upstairs):** royal bed to sleep in, yellow and blue flowers, Stardew-style and Remarried-Empress-style posters (original art), mirror, door to the study.
- **Study:** bookshelves open the **Library** (`Library.tsx`, `books.ts`): Goosebumps, Roald Dahl, Junie B. Jones, Wimpy Kid, Harry Potter, Darren Shan, Fear Street, Inheritance Cycle, Lord of the Rings and The Remarried Empress. The pages are **original summaries and shelf notes, not the books' text** (the site is public, so copyrighted text is not reproduced).
- The same wall clock hangs in every room. Globe: spin for a fact.
- **Fishing:** every pond has a bank spot (`FishingGame.tsx`, catches saved in `trail-fish`).
- **Editable boards:** Sheza and the superadmin walk to a board and edit it (`BoardEditor.tsx`, `POST /api/board`, stored in the `Setting` table as `board.sorry` / `board.kind`, shown live to everyone online through a `server:mod` message and on the next load for others).

## Art and license
Tiles and sprites are from **Sprout Lands** (free Basic pack) by Cup Nooble, extracted to `D:\Sheza Blog\assets\sprout-lands\` (not part of the site). Only the sprites used are copied to `public/game/`.
- Free license: **non-commercial only**, credit required (shown in the game HUD and `public/game/CREDITS.txt`), no redistributing the pack, no NFT/AI-training use.
- If the blog is ever monetised, buy the premium pack or ask Cup Nooble for terms.
- Not a copy of Stardew Valley's art: Sprout Lands is lighter and more pastel.

## Tested
- Whole trail walkable from the campfire to the mailbox (all 19 posts reached).
- Sign auto-walk, post modal, Escape, deep link, read counter.
- About, jukebox (Song page) and mailbox (subscribe form shown, not submitted).
- Phone width: no sideways scroll, joystick moves and stops.
- `tsc` and `eslint` clean. `next build` not run.

Also checked after the popup / map / readers work: About, Song, Admin (login screen only, not signed in) and post popups open from deep links; tapping the Admin house auto-walks and opens it; phone layout fits. Not yet tested on a real phone.

## Known gaps / ideas
- The floating music player overlaps the joystick area and bottom signs on phones (it collapses).
- Only simple props are in the pack's style; no cliffs, crops or animals yet (the pack has tilled dirt, hills, chickens and cows).
- Optional: admin control over sign positions/icons (needs a Prisma field), ambient sound, day/night, a mini-map or "jump to post" list for long trails.
- Dev note: the Turbopack dev server on Windows can serve stale `globals.css`; a real edit to the file forces a rebuild.

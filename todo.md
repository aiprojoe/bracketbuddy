# BracketBuddy TODO

## Phase 2: Database Schema & Foundation
- [x] Design and push database schema (brackets, picks, teams, achievements, leaderboard, comments)
- [x] Seed 2026 March Madness team data (68 teams with seeds, regions, stats)
- [x] Set up tRPC routers for all features
- [x] Configure global theme (dark, energetic, March Madness orange/blue)

## Phase 3: Bracket UI
- [x] Interactive 68-team bracket builder with click-to-pick
- [x] All rounds: First Four, R64, R32, Sweet 16, Elite 8, Final Four, Championship
- [x] Mobile-responsive bracket with swipe/touch support
- [x] Bracket progress indicator and completion percentage
- [x] Auto-advance picks through rounds

## Phase 4: Gamification
- [x] Points system: base points per round with multipliers
- [x] Upset bonus points (higher seed beats lower seed)
- [x] Achievement/badge system (Bracket Buster, Upset King, Cinderella Story, etc.)
- [x] Public leaderboard with real-time rankings
- [x] Trash-talk comment threads on leaderboard
- [x] Points breakdown and scoring explanation

## Phase 5: VAPI Voice Assistant
- [x] VAPI SDK integration (@vapi-ai/web)
- [x] Voice bracket picking (push-to-talk, 30s max, cost-efficient)
- [x] AI-powered bracket recommendations on demand (free LLM text chat)
- [x] Voice-activated upset predictions and Cinderella picks
- [x] Floating voice button with animated mic indicator

## Phase 6: Social & Profiles
- [x] Shareable bracket card generator (beautiful social media image)
- [x] User profile page with stats, achievements, bracket history
- [x] Share to Twitter/X, Instagram, TikTok
- [x] Copy bracket link feature
- [x] AI bracket analysis with upset predictions

## Phase 7: Polish
- [x] Animations (badge unlock animations, voice pulse)
- [x] Fun copy and micro-interactions throughout
- [x] Mobile touch gestures for bracket navigation
- [x] Landing page with viral hooks and social proof
- [x] SEO and Open Graph meta tags for sharing

## Cost-Efficient Voice Redesign
- [x] Replace always-on VAPI session with push-to-talk (hold button) model
- [x] Hard 30-second max per voice session with visible countdown timer
- [x] Route all AI chat/analysis through built-in LLM (free) — VAPI only for STT+TTS
- [x] Add "Ask AI" text chat fallback (free, unlimited)
- [x] Auto-disconnect VAPI after response is complete
- [x] Rate limit: max 3 voice sessions per user per day (server-enforced)

## Bracket Challenge Feature
- [x] Add challenges table to DB schema (challenger, challenged, invite token, status)
- [x] Add challengeParticipants table (userId, challengeId, bracketId, score)
- [x] Push schema migration
- [x] Add challenge DB helpers (create, accept, getByToken, getForUser, getH2H)
- [x] Add challenge tRPC router (create, accept, getMyChallenge, getH2H, list)
- [x] Build ChallengeInvite page (/challenge/invite/:token) — accept or view challenge
- [x] Build Challenges list page (/challenges) with all user's active and pending duels
- [x] Build H2H comparison page (/challenge/:id/h2h) with pick-by-pick breakdown
- [x] Add "Challenge a Friend" button on Bracket page (floating CTA after 10+ picks)
- [x] Add challenge invite link copy + share to Twitter/X
- [x] Wire routes in App.tsx (/challenges, /challenge/invite/:token, /challenge/:id/h2h)
- [x] Write vitest tests for challenge procedures (8 new tests, 18 total passing)

## Voice Migration: VAPI → Web Speech API (Free)
- [x] Rewrite VoiceAssistant.tsx using browser Web Speech API (SpeechRecognition)
- [x] Remove @vapi-ai/web package dependency
- [x] Remove VITE_VAPI_PUBLIC_KEY references from code
- [x] Keep push-to-talk UX, animated mic button, and AI text response panel
- [x] Add browser compatibility check (Chrome/Edge/Android supported; Safari fallback message)
- [x] Update Bracket.tsx to use new VoiceAssistant props if changed (no props needed)
- [x] Run tests and verify 0 TypeScript errors (18/18 passing)

## Voice-to-Pick Flow Fix
- [x] Add ai.parseVoicePick tRPC procedure: extract team name from speech, fuzzy-match to bracket teams, return teamId + confirmation message
- [x] Update VoiceAssistant to accept onPickByVoice prop and detect pick intent in AI response
- [x] Wire onPickByVoice callback in Bracket.tsx to call the existing pick handler
- [x] Show visual confirmation toast when voice pick updates bracket
- [x] Run tests and verify 0 TypeScript errors (18/18 passing)

## Live Score Feed (ESPN Unofficial API)
- [x] Research and validate ESPN API endpoints for NCAA tournament scores
- [x] Add gameResults table to DB schema (espnGameId, espnStatus, isScored, team ESPN IDs)
- [x] Add tournamentConfig table (isLocked, isSyncEnabled, lastSyncAt, lastSyncStatus)
- [x] Push schema migration
- [x] Add ESPN sync server function espnSync.ts (fetch, team matching, pick scoring, bracket totals)
- [x] Add auto-scoring engine (compare game results to user picks, award points)
- [x] Add tournament tRPC router (liveScores, config, syncNow, setLocked, setResult)
- [x] Add admin panel page (/admin) for tournament management (lock brackets, trigger sync, view results)
- [x] Add LiveScoresBanner component (scrolling ticker on bracket page)
- [x] Wire LiveScoresBanner into Bracket page
- [x] Write vitest tests for tournament procedures (24/24 passing, 0 TypeScript errors)

## Scheduled ESPN Sync Job
- [x] Add syncScheduler.ts with smart interval logic (5 min during tournament, 1 hr otherwise)
- [x] Wire scheduler into server/_core/index.ts on startup
- [x] Add graceful shutdown (clearTimeout on SIGTERM/SIGINT)
- [x] Add tournament.syncStatus tRPC procedure for real-time scheduler state
- [x] Update Admin panel with live sync countdown and scheduler status (auto-refreshes every 15s)
- [x] Write vitest tests for scheduler logic (28/28 passing)

## Selection Sunday Readiness (March 15)
- [x] Fix stale DB connection pool (done - mysql2 pool with keepAlive)
- [x] Add resetDb() on fatal sync errors (done)
- [x] Add admin "Update Teams" tool - paste real bracket at 7pm EST
- [x] Add tRPC procedure: tournament.updateTeams (bulk upsert teams + clear picks)
- [x] Add "Bracket Reset" option in admin (clear all user picks when real teams load)
- [x] Run full tests and verify 0 TS errors (28/28 passing)
- [x] Save checkpoint and publish

## Production Polish Sprint
- [x] Welcome toast on first sign-in ("Welcome to BracketBuddy! 🏀")
- [x] First-login redirect to bracket page automatically
- [x] Onboarding banner for logged-in users with 0 picks
- [x] Confetti animation on bracket picks (canvas-confetti) — subtle pop, big burst on upsets, epic on champion
- [x] Empty states already handled in leaderboard, challenges, profile
- [x] Loading states already handled in all pages
- [x] ErrorBoundary already wired in App.tsx
- [x] Mobile layout audited — responsive grid and flex layouts throughout
- [x] Removed VAPI references from landing page copy
- [x] Landing page copy updated — no VAPI mentions
- [x] Bracket lock countdown timer added to Home page (live seconds)
- [x] 0 TypeScript errors, 28/28 tests passing

## Real 2026 Bracket Update (Selection Sunday)
- [ ] Fetch real 68-team bracket from ESPN API
- [ ] Update all teams in DB with real seeds, regions, names
- [ ] Trigger ESPN sync for any live game data
- [ ] Verify bracket page shows real teams

## Final Rollout Features
- [ ] Add bracket zoom-out toggle button (CSS scale 0.65) for mobile/full-bracket view
- [ ] Improve Admin Update Teams UX: JSON template, field guide, First Four instructions
- [ ] Run tests, save final checkpoint, publish

## Footer Badge — Unrivaled Business Solutions
- [x] Create PoweredByFooter component (enterprise-grade, minimal, links to unrivaledbusinesssolutions.com)
- [x] Add "Want an app like this?" CTA in footer
- [x] Add footer to App.tsx so it appears on all pages
- [x] Run TypeScript check and save checkpoint (0 errors)

## Share Button Feature
- [x] Build ShareBracketModal component with Twitter/X, Facebook, copy-link, and Web Share API
- [x] Add share button to Bracket page floating CTA (visible after 10+ picks)
- [x] Share modal wired to bracketData.shareToken for permanent shareable link
- [x] Generate dynamic share text with user's champion pick and points
- [x] Run TypeScript check (0 errors) and save checkpoint

## Full Polish Sprint
- [x] Remove dead "Voice AI" header button — replaced with functional "Ask Buddy" button that opens the AI panel
- [x] Add "Pick earlier rounds first" unlock hint on TBD matchup slots (← Round of 64 first)
- [x] Improve voice browser compatibility — clear Chrome-only notice with icon + "Switch to AI Advice" CTA button
- [x] Fix Voice AI button in header — now opens VoiceAssistant panel via forceOpen prop
- [x] Add pick count badge to region tabs (verified working)
- [x] Fix mobile: bracket tabs overflow on small screens (overflow-x-auto already in place)
- [x] Add mobile scroll hint on bracket page (← Scroll to see all rounds →)
- [x] Hide floating mic button when panel is open (no overlap)
- [x] Add tooltip label to floating mic button on hover
- [x] Fix rarity-*-bg CSS classes (border was not applying correctly)
- [x] Fix achievement card class in Profile page (rarity-*-bg pattern)
- [x] Run TypeScript check and all tests (0 errors, 28/28 passing)

## Bracket Pick Flow Fix
- [x] Fix Matchup component: allow clicking a team even when opponent is TBD (was requiring both teams)
- [x] Fix onPick handler in bracket render: remove `if (!t1 || !t2) return` guard
- [x] Fix Final Four onPick handler: same TBD-blocking guard removed
- [x] Fix Championship onPick handler: same TBD-blocking guard removed
- [x] Fix voice-to-pick handler: allow voice picks when one team is TBD
- [x] 0 TypeScript errors, 28/28 tests passing

## Feature Upgrade Sprint (Best-of-Sites + Print + Pick Preservation)
- [x] Fix pick preservation: updateTeams already uses clearPicks=false default; team updates by seed+region preserve team IDs so picks survive (verified)
- [x] Add seed matchup history data to shared bracketData.ts (SEED_WIN_RATES_R64, getUpsetProbability, getSeedMatchupLabel)
- [x] Add upset probability badge to each matchup slot (🔥35% shown inline between teams)
- [x] Build TeamInfoTooltip component: hover/tap team to see PPG, record, seed history, conference, upset chance
- [x] Add team info tooltip on all bracket matchups (hover/tap to see team stats)
- [x] Build printable bracket view: /bracket/print route with print-optimized CSS (landscape, 2x2 grid)
- [x] Add "Print" button to bracket page header (opens /bracket/print in new tab)
- [x] Add auto-fill bracket feature: Chalk / Chaos Mode / Upset Special modes with AutoFillModal
- [x] Add "Auto-Fill" button to bracket page header
- [x] Add FactsTicker component: rotating March Madness trivia above bracket
- [x] Add ScoreTracker component: correct/incorrect picks with round breakdown (collapses when no games played)
- [x] Add "Reset picks" button (bottom-left, only when picks exist)
- [x] 0 TypeScript errors, 28/28 tests passing

## Accuracy & Reliability Audit
- [x] VOICE: No VAPI needed — using browser Web Speech API (free, zero cost, zero setup). Works in Chrome/Edge/Android. Safari/Firefox users auto-fall back to text chat.
- [x] PICK PERSISTENCE: Verified — updateTeams uses clearPicks=false by default; team IDs are stable across updates so all picks survive.
- [x] LEADERBOARD: Verified — points sourced from users.totalPoints which is incremented atomically by the scoring engine. No double-counting possible.
- [x] SCORING ENGINE: Verified — scorePicks() only fires once per game (isScored guard prevents re-scoring). Points use GREATEST(0,...) to prevent negatives.
- [x] BUG FIXED: upsertPick() was not reversing points when a user changed a pick that had already been scored. Now: if pick changes after scoring, old points are reversed from bracket + user totals, and isCorrect/pointsEarned/actualWinnerId are reset so sync engine re-scores on next run.
- [x] MATCHUP ID MATCHING: Verified — buildMatchupId() in espnSync.ts uses same format as Bracket.tsx (e.g. "East-round64-0"). Round of 64 uses seed-pair index; later rounds use minSeed v maxSeed key.
- [x] 0 TypeScript errors, 28/28 tests passing after fix

## Custom Domain & Branding Cleanup
- [x] Remove PoweredByFooter (Manus badge) from App.tsx
- [x] Verify no "manus" text appears anywhere in user-visible UI (0 matches)
- [x] Update app meta title/description to BracketBuddy only (author: Unrivaled Business Solutions)
- [x] Add Open Graph + Twitter Card meta tags
- [x] Replace manus.space URL in PrintBracket header and footer with bracketbuddy.unrivaledbusinesssolutions.com
- [ ] Save checkpoint and publish
- [ ] Provide DNS CNAME instructions for bracketbuddy.unrivaledbusinesssolutions.com

## UBS Footer & Branding
- [x] Add Unrivaled Business Solutions footer to all pages (link to www.unrivaledbusinesssolutions.com)
- [x] Footer style: minimal, dark, enterprise — no Manus references anywhere

## First Four / Play-In Fix
- [x] Add First Four tab to bracket UI showing all 4 play-in games (March 18–19 dates shown)
- [x] First Four winners feed into correct Round of 64 slots via getR64Team() helper
- [x] FIRST_FOUR_MATCHUPS definition added to shared/bracketData.ts with region+winnerSeed mapping
- [x] getR64Team() checks isFirstFour flag: if 2 play-in teams exist, uses picked winner; else falls back to normal team
- [x] Tabs: First Four | East | West | South | Midwest | Final Four (all working)
- [x] 0 TypeScript errors, 28/28 tests passing

## Lock Deadline Update (March 20 — Thursday Round of 64)
- [x] Update all "March 18" lock deadline references to "March 20" (Thursday tip-off 12:15pm ET)
- [x] Update countdown timer target date in Home.tsx (2026-03-20T12:15:00-04:00)
- [x] Update copy in Home hero and CTA sections
- [x] Update copy in First Four tab explanation (Picks lock March 20)
- [x] Update Admin panel ESPN hint to show First Four: March 18-19, Round of 64: March 20-21
- [x] No LOCK_DATE in shared/bracketData.ts (only in Home.tsx — already updated)

## Bracket Visual Clarity
- [x] Add SVG connector lines from each matchup pair to the next round slot (BracketConnectors component)
- [x] Add clear visual card border around each R64 matchup pair (rounded-lg border bg-card)
- [x] Increase spacing between matchups in R64 from 8px to 12px
- [x] Add connector from Elite Eight into Region Winner slot
- [x] Add React.Fragment key to fix React warning
- [x] 0 TypeScript errors, Vite HMR clean

## Connector Line Seed H2H Tooltip
- [x] Add SEED_H2H_RECORDS data to shared/bracketData.ts (all 8 R64 seed matchups with wins/losses/pct + fun facts)
- [x] Add getSeedH2H() helper to bracketData.ts
- [x] Rewrite BracketConnectors to accept seedPairs prop and show tooltip on hover
- [x] Tooltip shows: seed matchup title, win/loss record, animated progress bar, win%, and fun fact
- [x] Small info dot on vertical connector line indicates hoverable area
- [x] Connector lines highlight on hover (brighter stroke)
- [x] Pass connectorSeedPairs from matchup data into BracketConnectors in bracket grid render
- [x] 0 TypeScript errors, Vite HMR clean

## Connector Line Alignment Fix (Critical)
- [ ] Remove all hardcoded pixel math for connector positions
- [ ] Use DOM ref measurement (getBoundingClientRect) to get actual matchup card centers
- [ ] Draw SVG connector lines from measured positions — pixel perfect
- [ ] Preserve H2H tooltip on connectors
- [ ] 0 TypeScript errors, visually verified

## Google OAuth Migration (Replace Manus Auth)
- [x] Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment secrets
- [x] Add googleClientId and googleClientSecret to server ENV config
- [x] Rewrite server/_core/oauth.ts: new /api/oauth/google initiation endpoint + Google callback handler
- [x] Store user email from Google profile in DB on every sign-in
- [x] Update client/src/const.ts: getLoginUrl() now points to /api/oauth/google
- [x] All login buttons across app automatically use new Google sign-in (no per-page changes needed)
- [x] Write vitest tests for Google OAuth config (3 new tests, 31 total passing)
- [ ] Publish to live domain

## Launch Sprint
- [x] Auto-assign admin role to owner's Google account on first login
- [x] Add OWNER_EMAIL env var so owner is recognized by email (not just openId)
- [x] Integrate Resend email service (welcome email + bracket lock reminder)
- [x] Add "Send Lock Reminder" button in Admin panel (emails all users before March 20)
- [x] Add welcome email sent on first sign-in
- [x] Run all tests, 0 TS errors, save checkpoint, publish

## Bracket Accuracy Fix
- [x] Research official 2026 NCAA Tournament 68-team bracket
- [x] Query DB for current teams and identify all duplicates/errors (NC State duplicate found)
- [x] Push corrected 68-team JSON to database (14 corrections made)
- [x] Verify no duplicates remain (57/57 matchup checks passed)

## Production Accuracy Audit & Hardening
- [x] Audit pick preservation: confirm no picks lost on team update, bracket reset, or server restart
- [x] Implement per-game tip-off locking (lock each game individually when it tips off, not all at once)
- [x] Add 2026 First Round tip-off schedule to server (all 32 games with exact times)
- [x] Lock picks for a specific game when that game's tip-off time passes
- [x] Verify leaderboard accuracy: scoring engine, point totals, tiebreakers — correctPicks tiebreaker added
- [x] Audit ESPN sync: confirm team name matching is robust (no missed scores)
- [x] Run full test suite and fix any failures (35/35 passing, 0 TS errors)

## Urgent Fixes (March 16)
- [x] Fix AI helper/analyzer (Ask Buddy / AI chat not working) — changed to publicProcedure, rewrote UI with error display and conversation history
- [x] Add prize/stakes section to Home page (1st/2nd/3rd place podium + 4 achievement badges)
- [x] Fix blank bracket print — ?blank=1 URL param hides all picks; Print Blank button added to print page
- [x] Verify user bracket print works correctly (picks highlighted in yellow, champion shown, footer URL correct)

## Code Fixes (March 16 — Batch 2)
- [x] Add First Four lock warning banner to Bracket.tsx (AlertTriangle, 24hr window)
- [x] Protect AI routes: analyzeBracket, parseVoicePick, chat → protectedProcedure
- [x] Add in-memory AI rate limiter (20 calls/user/hour) to routers.ts
- [x] Fix analyzeBracket: add teamSummary variable (all 68 teams) + update system prompt
- [x] Fix response_format `as any` cast in parseVoicePick
- [x] Fix silent DB failure: getDb() now throws loudly instead of returning null

## Improvements (March 16 — Batch 3)
- [x] VoiceAssistant.tsx — sign-in gate for logged-out users with Google login CTA
- [x] server/db.ts — add maxPossiblePoints to getLeaderboard select
- [x] Leaderboard.tsx — show max possible points below score

## Fixes & Improvements (March 16 — Batch 4)
- [x] Bug: autoFill hardcodes isUpset=false — fix to calculate correctly
- [x] Bug: autoFill ignores locked matchups — add isMatchupLocked() check
- [x] UX: SharedBracket shows pick counts only — show actual team names per round
- [x] UX: Add og:url, og:image, twitter:image, canonical to index.html + generated branded OG image (1200x630)
- [x] UX: ChallengeInvite already-joined state already implemented — verified no change needed
- [x] UX: Leaderboard shows no message before tournament starts — added pre-tournament zero-score message

## URGENT Fixes (March 16 — First Four Tomorrow)
- [ ] Fix Home page countdown: show First Four is TOMORROW (March 17), not March 20
- [ ] Update CTA copy to reflect First Four urgency
- [ ] Update leaderboard pre-tournament message date from March 20 to March 17

## Messaging/Lock Fixes (March 16 — Batch 5)
- [x] Fix Home countdown to Thursday March 19 global lock (not March 20 or March 17)
- [x] Update countdown label: "Most picks lock Thursday March 19 · First Four games lock at tip-off March 17–18"
- [x] Update CTA copy to reflect per-game locking and Thursday deadline
- [x] Fix First Four warning banner text in Bracket.tsx
- [x] Fix First Four tab label dates in Bracket.tsx
- [x] Fix email templates: welcome email and lock reminder dates (March 19 + per-game locking language)
- [x] Verify autoFill isUpset fix is already applied (winnerTeam.seed > loserTeam.seed confirmed)

## OAuth Callback URL Fix
- [x] Replace req.protocol + req.get("host") with APP_URL env var in /api/oauth/google route
- [x] Replace req.protocol + req.get("host") with APP_URL env var in /api/oauth/callback route
- [x] Add APP_URL=https://bracketbuddy.unrivaledbusinesssolutions.com secret

## Admin User Export
- [x] Add exportUsers tRPC procedure to tournament router (admin-only, returns all users as array)
- [x] Add export query, handleExportUsers handler, and Export Users CSV button to Admin.tsx
- [x] Import Download icon from lucide-react in Admin.tsx

## Multiple Login Methods
- [x] Add magicLinkTokens table to drizzle schema (token, email, name, expiresAt, usedAt)
- [x] Push schema migration (pnpm db:push)
- [x] Add /api/auth/magic-send endpoint: generate token, send email with link
- [x] Add /api/auth/magic-verify endpoint: validate token, upsert user, set session cookie
- [x] Add auth.emailSignIn tRPC procedure: accept name + email, upsert user, set session cookie (instant, no email needed)
- [x] Build /login page with three options: Google Sign-In, Email Magic Link, Name+Email quick entry
- [x] Update getLoginUrl() and all sign-in CTAs to point to /login instead of /api/oauth/google
- [x] Update NavBar sign-in button to link to /login
- [x] Wire /login route in App.tsx

## Urgent Copy Fixes (March 17 Launch)
- [x] Fix LOCK_DATE in Home.tsx to use First Four date (March 17) with dynamic label
- [x] Fix CTA copy in Home.tsx from "March 20" to First Four tomorrow March 17

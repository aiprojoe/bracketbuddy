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

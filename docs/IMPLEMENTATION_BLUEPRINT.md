# Data Design And Auth Flow Blueprint

Implementation blueprint for:
- Firebase Auth
- PostgreSQL learning data
- Redis live multiplayer state
- Go backend
- React frontend

This plan is optimized for incremental delivery with minimal disruption to the current project.

## Target Architecture

### Responsibilities

- `Firebase Auth`
  - sign-in
  - sign-out
  - token issuance
  - social/email authentication

- `Go backend`
  - verify Firebase ID tokens
  - map Firebase users to app users
  - own business rules
  - write durable learning data to PostgreSQL
  - run WebSocket multiplayer logic

- `PostgreSQL`
  - user profiles
  - learning sessions
  - question attempts
  - concept mastery
  - review recommendations

- `Redis`
  - active rooms
  - reconnect state
  - live question state
  - temporary multiplayer scores

## Identity Strategy

Use three identities with clear separation:

1. `firebase_uid`
   - identity from Firebase Auth
   - stable external auth identifier

2. `users.id`
   - internal application user id in PostgreSQL
   - stable foreign key for all product data

3. `player uid`
   - temporary multiplayer socket/player identity
   - used for room membership and reconnect handling

Important rule:
- WebSocket reconnect logic should continue using player identity.
- Durable learning and profile data should use app user identity.

## Database Design Summary

Core tables:
- `users`
- `categories`
- `concepts`
- `questions`
- `question_concepts`
- `learning_sessions`
- `session_question_attempts`
- `user_question_stats`
- `user_concept_mastery`

Optional later:
- `review_recommendations`
- `multiplayer_matches`
- `multiplayer_match_players`

Detailed schema:
- see [LEARNING_ANALYTICS_SCHEMA.md](/Users/justinlien/Desktop/typography/docs/LEARNING_ANALYTICS_SCHEMA.md)

## HTTP Auth Flow

### Frontend Login Flow

1. User signs in with Firebase Auth on the frontend.
2. Frontend gets Firebase ID token via SDK.
3. Frontend sends the token to the backend in:
   - `Authorization: Bearer <id_token>`
4. Backend verifies the token with Firebase Admin SDK.
5. Backend extracts:
   - `firebase_uid`
   - `email`
   - display name if present
6. Backend finds or creates a row in `users`.
7. Backend proceeds using `users.id` as the application user id.

### Backend Middleware

Add auth middleware for protected HTTP routes:

```text
parse Authorization header
-> verify Firebase token
-> load/create app user
-> attach auth context to request
```

Suggested auth context:

```go
type AuthContext struct {
    FirebaseUID string
    UserID      string
    Email       string
}
```

### Protected HTTP APIs

Recommended initial APIs:

- `GET /api/me`
  - returns current profile + summary stats

- `GET /api/me/history`
  - returns recent learning sessions

- `GET /api/me/weak-areas`
  - returns weakest concepts ordered by mastery score

- `GET /api/me/review`
  - returns recommended concepts/questions for review

- `POST /api/learning/sessions`
  - create one completed solo session with question attempts

- `POST /api/learning/sessions/:id/finalize`
  - optional if you want a two-step write

## WebSocket Auth Flow

You have two viable patterns.

### Recommended Pattern For This Project

Authenticate at WebSocket connect time, but keep guest mode available.

Client connects to:

```text
/ws?token=<firebase_id_token>
```

or:

```text
/ws?guest=1
```

Backend connect flow:

1. Upgrade request hits `/ws`
2. If token exists:
   - verify Firebase token
   - load/create app user
   - attach auth metadata to socket client
3. If no token:
   - mark client as guest
4. Create temporary player uid as today
5. Continue existing multiplayer protocol

Socket client metadata should become something like:

```go
type ClientIdentity struct {
    PlayerUID    string
    UserID       *string
    FirebaseUID  *string
    Guest        bool
}
```

### Why Not Use Firebase UID As Room Player ID

Do not replace the existing room/player UID with Firebase UID.

Reason:
- your reconnect flow is currently socket-oriented and room-oriented
- using Firebase UID directly would couple auth identity with volatile room state
- keeping player UID separate preserves existing reconnect logic

Instead:
- keep player UID for gameplay
- attach `user_id` as metadata for persistence at the end of the match

## Session Write Flow

### Solo Session Persistence

When a solo quiz ends:

1. Frontend computes final result summary.
2. Frontend sends session payload to backend.
3. Backend:
   - inserts into `learning_sessions`
   - inserts per-question rows into `session_question_attempts`
   - updates `user_question_stats`
   - updates `user_concept_mastery`
4. Backend returns updated summary if needed.

### Multiplayer Session Persistence

When a multiplayer match ends:

1. Redis-backed game loop finishes as today.
2. Backend identifies authenticated users linked to each player.
3. Backend writes:
   - optional `multiplayer_matches`
   - one `learning_sessions` row per authenticated player
   - per-question attempts if you decide to persist them
   - mastery/stat updates for authenticated users only

Guest players:
- can still play
- do not receive durable personalized history unless you choose to support guest migration later

## Question And Concept Update Flow

For each attempt:

1. Read all concepts linked to the question from `question_concepts`.
2. Insert raw attempt row into `session_question_attempts`.
3. Upsert `user_question_stats`.
4. Upsert `user_concept_mastery`.

Suggested first-pass mastery update:

```text
attempts += 1
correct_count += is_correct ? 1 : 0
incorrect_count += is_correct ? 0 : 1
mastery_score = 100 * correct_count / attempts
needs_review = mastery_score < threshold and attempts >= min_attempts
```

Good MVP thresholds:
- `threshold = 70`
- `min_attempts = 2`

## Migration Strategy From Current App

Current state:
- solo history is stored in localStorage
- multiplayer reconnect state uses sessionStorage
- no durable user backend yet

Recommended migration:

### Phase 1

- Add Firebase Auth frontend
- Add backend Firebase token verification
- Add `users` table
- Add `learning_sessions` and `session_question_attempts`
- Keep existing localStorage for fallback

### Phase 2

- On login, start writing new completed sessions to backend
- Keep reading localStorage for anonymous users
- Optionally offer one-time import of local history after login

### Phase 3

- Add `user_question_stats` and `user_concept_mastery`
- Build weak-area and review APIs

### Phase 4

- Attach auth metadata to WebSocket clients
- Persist multiplayer learning outcomes for authenticated users

## API Payload Sketches

### `POST /api/learning/sessions`

Request:

```json
{
  "mode": "solo",
  "startedAt": "2026-04-01T20:00:00Z",
  "completedAt": "2026-04-01T20:05:00Z",
  "totalQuestions": 6,
  "correctAnswers": 4,
  "attempts": [
    {
      "questionId": "q_8",
      "answeredAt": "2026-04-01T20:00:15Z",
      "responseTimeMs": 4200,
      "isCorrect": true,
      "selectedOptionIds": ["opt1"]
    }
  ]
}
```

### `GET /api/me/weak-areas`

Response:

```json
{
  "concepts": [
    {
      "conceptId": "x_height",
      "name": "x-height",
      "masteryScore": 52.3,
      "attempts": 7,
      "needsReview": true
    }
  ]
}
```

### `GET /api/me/review`

Response:

```json
{
  "items": [
    {
      "type": "concept",
      "conceptId": "terminal",
      "reason": "Low mastery and not reviewed recently",
      "priority": 9
    }
  ]
}
```

## Go Backend Work Breakdown

### New packages you will likely want

- `backend/internal/auth`
  - Firebase token verification
  - auth middleware
  - auth context helpers

- `backend/internal/db`
  - PostgreSQL connection
  - query helpers or repository layer

- `backend/internal/learning`
  - session persistence
  - mastery updates
  - recommendation logic

### Suggested interfaces

```go
type UserRepository interface {
    FindOrCreateByFirebase(ctx context.Context, firebaseUID, email, displayName string) (User, error)
}

type LearningRepository interface {
    SaveSession(ctx context.Context, input SaveSessionInput) error
    GetWeakAreas(ctx context.Context, userID string, limit int) ([]WeakArea, error)
    GetReviewItems(ctx context.Context, userID string, limit int) ([]ReviewItem, error)
}
```

## Frontend Work Breakdown

### New frontend responsibilities

- auth provider for Firebase session
- token-aware API client
- user profile/summary loading
- weak-area UI
- review recommendation UI

### Existing code that can evolve cleanly

- local history code in [`src/context/StorageContext.tsx`](/Users/justinlien/Desktop/typography/src/context/StorageContext.tsx)
- local persistence helpers in [`src/utils/storage.ts`](/Users/justinlien/Desktop/typography/src/utils/storage.ts)

These should gradually become:
- guest storage adapter
- backend-backed storage adapter for signed-in users

## Risks And Decisions

### High-value decisions

- Keep guest mode or require login for persistence
- Whether to migrate old localStorage history into PostgreSQL
- Whether multiplayer writes full per-question attempts or only final session summaries

### Main risks

- coupling Firebase identity too tightly to gameplay identity
- overcomplicating mastery scoring too early
- writing only summaries and losing useful raw attempt data
- storing live room state in Postgres instead of Redis

## Recommended MVP Build Order

1. Add PostgreSQL connection and migration setup.
2. Add Firebase Admin verification in Go.
3. Add `users` + protected `GET /api/me`.
4. Add `learning_sessions` + `session_question_attempts` write API for solo mode.
5. Add `user_question_stats` and `user_concept_mastery` updates.
6. Build `GET /api/me/weak-areas`.
7. Build `GET /api/me/review`.
8. Attach authenticated identity to WebSocket clients.
9. Persist multiplayer outcomes for signed-in users.

## Bottom Line

The clean architecture for this project is:

- Firebase Auth for identity
- PostgreSQL for learning memory
- Redis for live multiplayer state

That split fits the current codebase well and lets you add learner-focused features without destabilizing the reconnect/gameplay logic you already built.

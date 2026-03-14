# Frontend-Backend Integration Status

This document tracks which frontend features are integrated with the real backend API vs. still using mock data.

## Auth (`loop-ui/lib/api/api.ts`)

| Feature | Status | Notes |
|---------|--------|-------|
| Login (email/password) | ✅ Integrated | `POST /auth/login` — `api.login()` |
| Register | ✅ Integrated | `POST /auth/register` — `api.register()` |
| Token refresh | ✅ Integrated | `POST /auth/refresh` — auto-retry on 401 |
| Logout | ✅ Integrated | `POST /auth/logout` — clears localStorage + WebSocket |
| Google OAuth | ✅ Integrated | Redirects to `GET /auth/google` |
| Apple OAuth | ✅ Integrated | Redirects to `GET /auth/apple` |
| Wallet connect (Ethereum) | ✅ Integrated | `POST /auth/wallet/nonce` + `POST /auth/wallet/verify` |
| Wallet connect (Aptos) | ✅ Integrated | `POST /auth/wallet/nonce` + `POST /auth/wallet/verify` |
| JWT persistence | ✅ Integrated | Stored in `localStorage` (`auth_token`, `refresh_token`, `user_data`) |

## Videos

| Feature | Status | Notes |
|---------|--------|-------|
| Feed (For You) | ✅ Integrated | `GET /feed` |
| Feed (Following) | ✅ Integrated | `GET /feed/following` |
| Get video by ID | ✅ Integrated | `GET /videos/:id` |
| Upload video | ✅ Integrated | `POST /videos` (multipart) |
| Chunked upload | ✅ Integrated | `POST /uploads/initiate`, `PUT /uploads/:id/chunk/:n`, `POST /uploads/:id/complete` |
| Update video | ✅ Integrated | `PUT /videos/:id` |
| Delete video | ✅ Integrated | `DELETE /videos/:id` |
| Like/unlike video | ✅ Integrated | `POST/DELETE /videos/:id/like` |
| Save/unsave video | ✅ Integrated | `POST/DELETE /videos/:id/save` |
| Share video | ✅ Integrated | `POST /videos/:id/share` |
| Track view | ✅ Integrated | `POST /videos/:id/track-view` |

## Comments

| Feature | Status | Notes |
|---------|--------|-------|
| Get comments | ✅ Integrated | `GET /videos/:id/comments` |
| Add comment | ✅ Integrated | `POST /videos/:id/comments` |
| Like/unlike comment | ✅ Integrated | `POST/DELETE /comments/:id/like` |
| Delete comment | ✅ Integrated | `DELETE /comments/:id` |

## Users

| Feature | Status | Notes |
|---------|--------|-------|
| Get current user | ✅ Integrated | `GET /users/me` |
| Get user by username | ✅ Integrated | `GET /users/:username` |
| Update profile | ✅ Integrated | `PUT /users/me` |
| Upload avatar | ✅ Integrated | `POST /users/me/avatar` |
| Follow/unfollow | ✅ Integrated | `POST/DELETE /users/:username/follow` |
| Get user videos | ✅ Integrated | `GET /users/:username/videos` |
| Block/unblock | ✅ Integrated | `POST/DELETE /users/:username/block` |
| Delete account | ✅ Integrated | `DELETE /users/me` |
| Privacy settings | ✅ Integrated | `GET/PUT /users/me/privacy-settings` |

## Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| Get notifications | ✅ Integrated | `GET /notifications` |
| Mark as read | ✅ Integrated | `PUT /notifications/:id/read` |
| Mark all as read | ✅ Integrated | `PUT /notifications/read-all` |

## Messaging

| Feature | Status | Notes |
|---------|--------|-------|
| Get conversations | ✅ Integrated | `GET /conversations` |
| Get messages | ✅ Integrated | `GET /conversations/:id/messages` |
| Send message | ✅ Integrated | `POST /conversations/:id/messages` |

## Search

| Feature | Status | Notes |
|---------|--------|-------|
| Search | ✅ Integrated | `GET /search?q=...` |

## Hashtags

| Feature | Status | Notes |
|---------|--------|-------|
| Get hashtag videos | ✅ Integrated | `GET /hashtags/:tag` |
| Trending hashtags | ✅ Integrated | `GET /hashtags/trending` |

## Sounds

| Feature | Status | Notes |
|---------|--------|-------|
| Get sound by ID | ✅ Integrated | `GET /sounds/:id` |
| Get sound videos | ✅ Integrated | `GET /sounds/:id/videos` |
| Trending sounds | ✅ Integrated | `GET /sounds/trending` |
| Browse sounds | ✅ Integrated | `GET /sounds` |
| Sound genres | ✅ Integrated | `GET /sounds/genres` |
| Search sounds | ✅ Integrated | `GET /sounds/search` |
| Toggle favorite | ✅ Integrated | `POST /sounds/:id/favorite` |
| Favorite sounds | ✅ Integrated | `GET /sounds/favorites` |

## Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| Analytics overview | ✅ Integrated | `GET /analytics/overview` |
| Video analytics | ✅ Integrated | `GET /videos/:id/analytics` |

## Discovery

| Feature | Status | Notes |
|---------|--------|-------|
| Trending videos | ✅ Integrated | `GET /discover/trending` |
| Top creators | ✅ Integrated | `GET /discover/creators` |

## Watch History

| Feature | Status | Notes |
|---------|--------|-------|
| Get history | ✅ Integrated | `GET /watch-history` |
| Clear history | ✅ Integrated | `DELETE /watch-history` |
| Remove entry | ✅ Integrated | `DELETE /watch-history/:videoId` |

## WebSocket

| Feature | Status | Notes |
|---------|--------|-------|
| Connection | ✅ Integrated | Auto-connects on login via `wsClient.connect(token)` |
| Token refresh | ✅ Integrated | `wsClient.updateToken(token)` called on refresh |
| Disconnect | ✅ Integrated | Called on logout |

---

## Notes

- There is no `mock-api.ts` file — the frontend was built against the real API from the start.
- All API calls go through `loop-ui/lib/api/api.ts` using `ApiClient.request<T>()`.
- JWT tokens are stored in `localStorage` as `auth_token`, `refresh_token`, and `user_data`.
- The `useAuth` hook (`loop-ui/hooks/useAuth.ts`) manages auth state across the app.

# Backend bug report — fix these

Confirmed, reproducible bugs found while building the frontend against the live API at
`https://instaback-cw0j.onrender.com`. Each was isolated with direct `curl` requests (not a
frontend issue) — reproduction steps and exact responses are below.

---

## Bug 1 — `GET /Story/get-user-stories/{userId}` always returns `null`

**Expected:** Same shape as `GET /Story/get-my-stories` (an array of the target user's active
stories), scoped to `userId` instead of the authenticated caller.

**Actual:** Always returns `{"data": null, "errors": null, "statusCode": 200}`, even when the
target user demonstrably has active stories.

**Reproduction:**
```bash
# 1. Confirm the user has active stories via get-my-stories (their own token)
curl -s "https://instaback-cw0j.onrender.com/Story/get-my-stories" \
  -H "Authorization: Bearer <user's own token>"
# → returns a non-empty array, e.g. two stories with ids 6 and 8

# 2. Fetch the same user's stories via get-user-stories (any caller, including the user itself)
curl -s "https://instaback-cw0j.onrender.com/Story/get-user-stories/<that user's id>" \
  -H "Authorization: Bearer <any valid token>"
# → {"data":null,"errors":null,"statusCode":200}
```

Tested with three different accounts (as self and as another follower) — always `null`, never the
actual list, regardless of privacy settings or follow relationship.

**Why it matters:** This is the only way the frontend can show another user's stories from their
profile page (tap avatar ring → view their story). Right now that flow silently shows "no story"
for everyone, because the endpoint never returns data.

**Likely cause:** The route handler probably queries by the wrong id field (e.g. filtering on the
*caller's* id instead of the `:userId` path param), or the query/serializer for this specific
route was never actually wired to real data and still returns a stub `null`.

---

## Bug 2 — `POST /Story/reply-to-story` crashes (502) when replying to your own story

**Expected:** Either succeeds normally, or returns a clean `4xx` with a message like "You can't
reply to your own story" (self-reply should arguably be blocked at all, since the reply UI never
offers it, but a graceful rejection is the minimum bar).

**Actual:** Returns a raw `502 Bad Gateway` (an unhandled server crash / HTML error page, not a
JSON error), when `storyId` belongs to the caller.

**Reproduction:**
```bash
curl -s -X POST "https://instaback-cw0j.onrender.com/Story/reply-to-story" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"storyId": <a story id owned by that same user>, "messageText": "test"}'
# → HTTP 502, empty/HTML body — not a JSON error response
```

Confirmed the story itself was valid and active (same id worked fine for `add-story-view`,
`get-story-viewers`, etc.). Replying to a **different** user's story with the identical request
shape works correctly and returns `200` with the expected message object — so the crash is
specific to the self-reply path, not the endpoint in general.

**Likely cause:** The handler probably tries to find-or-create a 1:1 chat between the caller and
themselves (since `senderId === recipientId` for a self-reply), and something in that chat-lookup
path throws an unhandled exception instead of being validated/rejected before reaching it.

---

## Bug 3 — `POST /Story/AddStories` silently drops the music track (`audioUrl`/`audioTitle`/`audioArtist`)

**Expected:** A story created with `audioUrl`/`audioTitle`/`audioArtist` form fields should return
(or at least later expose via `get-my-stories`/`get-stories`) that music data on the story object,
the same way `sticker` is exposed.

**Actual:** The fields are accepted (no error) but never persisted. The story object returned by
`get-my-stories` afterwards has no `audioUrl`, `audioTitle`, `musicTrack`, or any music-related
field at all — as if the fields were never sent.

**Reproduction:**
```bash
curl -s -X POST "https://instaback-cw0j.onrender.com/Story/AddStories" \
  -H "Authorization: Bearer <token>" \
  -F "Image=@photo.png" \
  -F "audioUrl=https://example.com/track.mp3" \
  -F "audioTitle=Test Song" \
  -F "audioArtist=Test Artist"
# → {"statusCode":200,"data":"Story added successfully","errors":null}

curl -s "https://instaback-cw0j.onrender.com/Story/get-my-stories" -H "Authorization: Bearer <token>"
# → the new story is present, but has no audioUrl/audioTitle/audioArtist/musicTrack field anywhere
```

**Why it matters:** This is why music never plays back on a published story, and why the duration
picked for it (a value derived from the track) never sticks — the backend throws the data away
before it can ever come back. The frontend now works around this with a same-device-only
localStorage cache (keyed by the real story id, resolved via a follow-up `get-my-stories` call
right after upload, since `AddStories` itself returns only a plain success string, not the created
story's id or url), but that workaround **only works in the browser that created the story** —
anyone else viewing it sees no music at all, because the server genuinely has none to serve.

**Fix needed:** Add `audioUrl`/`audioTitle`/`audioArtist` (and ideally `audioDurationMs`) columns
to the Story model, persist them on `AddStories`, and include them on every story-fetch endpoint
the same way `sticker` already is.

---

## Bug 4 — The `sticker` object has no position/size — stickers can't be placed on the photo

**Expected (or at least: a documented "not supported yet"):** A way to store where on the image a
POLL/QUESTION/MENTION sticker was placed (x/y, and ideally scale), so it renders in the same spot
for every viewer, not just centered.

**Actual:** The `sticker` object returned by every story-fetch endpoint has a fixed schema with no
spatial field at all:
```json
"sticker": {
  "id": "...", "type": "MENTION", "linkUrl": null, "options": [], "storyId": 13,
  "linkLabel": null, "questionText": "", "countdownLabel": null,
  "countdownEndsAt": null, "mentionedUserId": "..."
}
```
Sending extra form fields like `stickerX=0.3&stickerY=0.6` on `AddStories` is silently accepted
and ignored — no error, but nothing comes back either.

**Why it matters:** Real placement (drag a poll/mention sticker anywhere on the photo, like
Instagram) can't persist across viewers without this. The frontend now offers tap-to-place in the
composer and remembers the position locally for the creator's own device (same caveat as Bug 3 —
useless for anyone else viewing the story), but that's a workaround, not the real feature.

**Fix needed:** Add `x`, `y` (and optionally `scale`/`rotation`) fields to the sticker
create/response schema.

---

## Bug 5 — Sticker fields (`question`, mention/link/countdown data) were mapped from the wrong
   JSON keys on the frontend — **not a backend bug, but flagging since it looks like one**

While tracking down Bugs 3–4 I found the frontend was reading `stickerQuestion`,
`stickerMentionUserId`, `stickerLinkUrl`, `stickerCountdownEndsAt` etc. as **flattened top-level
fields on the story object** — but your API only ever nests all of that under the single `sticker`
object shown above (`sticker.questionText`, `sticker.mentionedUserId`, `sticker.linkUrl`,
`sticker.countdownEndsAt`), regardless of type. That mismatch meant poll/question text, mention
targets, link stickers, and countdowns all silently failed to render once a story was re-fetched,
even though `AddStories` had accepted and stored them correctly. **Already fixed on the frontend**
(now reads `sticker.questionText` / `sticker.mentionedUserId` / etc.) — mentioning it only because
if any other client (mobile app, etc.) reads the flattened field names, it has the same bug.

---

## Not bugs, just naming to double check against your own docs (frontend already adapted)

These aren't blocking anything — just flagging in case they're also inconsistent elsewhere:

- The spec pattern `POST/GET/DELETE /User/*-muted-word(s)` doesn't literally hold for delete —
  `DELETE /User/delete-muted-word` doesn't exist; the working route is
  `DELETE /User/remove-muted-word?word=`.
- `POST /Notification/register-push-token` requires `platform` to be uppercase (`"WEB"`, not
  `"web"`) — a lowercase value 400s with `"platform must be IOS, ANDROID, or WEB"`.

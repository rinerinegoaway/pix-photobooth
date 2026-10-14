# . PIX — by Rine

A browser photobooth with three modes:

- **Solo booth** — one person, one camera.
- **Together booth** — two people in front of one device.
- **Long-distance booth** — two devices, live video side by side, a server-timed countdown, and a combined strip with both people in every frame.

React + TypeScript + Vite + Tailwind on the front end; a small Bun server for room signaling.

## Run it

```bash
bun install
bun run dev        # Vite on :5173 and the signaling server on :8787 (Vite proxies /ws and /api)
```

Cameras need a secure context. `localhost` works for development. To test across two real devices you need HTTPS (a tunnel such as `cloudflared` or `ngrok` pointed at port 5173 works).

Production:

```bash
bun run start      # builds, then serves dist/ and the /ws signaling endpoint from one process (PORT, default 8787)
```

Put it behind HTTPS (a reverse proxy or your host) and set `TRUST_PROXY=1` if the proxy sets `X-Forwarded-For`.

### Checks

```bash
bun run build      # tsc -b (app + server) and vite build
bun run lint       # oxlint
bun test           # signaling-server tests (rooms, resume, coordinated countdown, failures)
```

## Server configuration (all optional)

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default 8787) |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to open the WebSocket and call the API (e.g. `https://pix.example`). Empty allows any. |
| `TRUST_PROXY=1` | Use `X-Forwarded-For` for rate limiting |
| `STUN_URLS` | Default `stun:stun.l.google.com:19302` (Google's public STUN) |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | A TURN relay for networks that block direct video. **Not configured by default**, so strict NATs/corporate networks may fail to connect until you add one. |
| `VITE_SIGNALING_URL` (build time) | Use a signaling server on another origin, e.g. `wss://signal.example/ws` |

## How the long-distance booth works

1. **Rooms.** The server keeps rooms in memory only: a random 16-character id (~78 bits), two seats, a 3-hour maximum life, rate limiting, and cleanup of abandoned rooms. Each seat has a secret, so only its owner can resume it after a dropped connection.
2. **Invite link.** `/#/join/<code>` — the code is in the URL fragment, which browsers do not send to servers.
3. **Video.** WebRTC, peer to peer, encrypted in transit. The server relays only session descriptions and ICE candidates.
4. **Countdown sync.** Each client measures its clock offset to the server (ping/pong, best round-trip wins). The server broadcasts one `captureAt` time to both; each device captures at that moment on its own clock. Both devices must be "ready" (camera live and video connected) before a countdown can start.
5. **Capture & acknowledgement.** Each person captures their own frame and sends it straight to the other over the WebRTC data channel (not through the server) and tells the server it captured. If both acknowledge, the shot is complete; if one does not within 5 s the server reports a failed shot and either side can retry. If the data channel fails, the capture falls back to a snapshot of the partner's live video.
6. **Combine.** Each browser composes the two frames (side by side or stacked, either order) into the shot, then into the strip.

**Limitations.** Two internet-connected devices can't capture at exactly the same instant. Expect tens to a couple hundred milliseconds of difference depending on network jitter, camera pipeline and device speed; this is "in step", not frame-exact. Without a TURN server some networks cannot connect.

## Exports

- **PNG**: 2× resolution, drawn by the same renderer as the live preview. The caption font is loaded before drawing.
- **Video**: the strip's own scenes drawn to a canvas and recorded with `MediaRecorder` in real time (6/10/15 s). MP4 is used only when the browser can really encode it; otherwise WebM. The file extension follows the actual encoding. Keep the tab open during recording. No audio is included.
- Neither export contains a ". PIX" signature; only the caption, names and date the user chose appear.

## Behind-the-scenes recording

Optional, off by default ("Save a behind-the-scenes video" in the session panel). When on, recording starts before the first countdown and stops about a second after the last photo, so it contains the real posing, countdowns and reactions. It is **not** made from the photos.

- It records the live camera video elements the booth already shows (no second camera stream) onto a canvas, then saves them with `MediaRecorder`: MP4 when the browser can encode it, otherwise WebM. The extension always matches the real encoding.
- Solo/Together can optionally include sound; that asks for the microphone separately and only then.
- In the long-distance booth, the recording shows **both** feeds as they appear on your screen. It only starts if both people turn "Record our moments together" on, and it is dropped if the connection is interrupted. It never includes sound, because the shared call carries video only.
- Recordings stay in the browser (a local file URL). Nothing is uploaded.
- Cancelling or leaving mid-session discards the partial recording.

## Community & live activity

Two landing-page sections backed by `server/community.ts`:

- **Feedback form** (`POST /api/feedback`): validated on the client and again on the server (type, 10–2000 character message, optional name/email, honeypot field, 5 messages per 10 minutes per IP). Messages are appended to `data/feedback.jsonl` on the host, one JSON object per line. The page only shows "Thank you" after the server confirms it saved the message; if the server is unreachable it shows an error. Set `FEEDBACK_WEBHOOK_URL` to also forward each message to a Slack/Discord-style webhook. Read the inbox with `cat data/feedback.jsonl`.
- **Live booth moments** (`GET /api/stats`, `POST /api/event`):
  - *Photo strips created*: one anonymous ping when a person reaches the final screen of a session.
  - *Booth sessions*: one ping when a four-photo solo/together session starts; shared booths are counted by the server when the first shot of a room's session begins.
  - *Active sessions now*: shared booth rooms with at least one person connected right now, read from the server's live room table.
  - *Community members*: **not tracked**. There are no accounts, so the page shows an "unavailable" state instead of a number. Add accounts before showing a real figure.
  - Totals live in `data/stats.json`. Counters are self-reported by browsers and unauthenticated, so treat them as estimates. If the server can't be reached, the page shows "unavailable", never made-up numbers.
- `DATA_DIR` changes where both files are stored (default `./data`, git-ignored). Back it up if you care about the totals and the inbox. Set `VITE_API_URL` at build time if the API lives on another origin (and list the site in `ALLOWED_ORIGINS`).

## Privacy summary

Solo and Together booths never upload anything. In the shared booth, live video goes to the other participant; the signaling server sees display names, connection details (including IP addresses carried in ICE candidates) and countdown timing, but never video or photos, and logs no room ids.

## Logo

`src/components/layout/Logo.tsx` is a vector redraw of the supplied logo. Replace it with the original asset if you have an exact SVG.

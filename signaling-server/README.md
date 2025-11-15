# Melodexa WebRTC Signaling Server

Node.js WebSocket server for WebRTC signaling (ICE/SDP exchange) and room management.

## Features

- WebSocket-based signaling for WebRTC peer connections
- Room creation and management with 5-digit codes
- Redis-backed presence and ephemeral state (Upstash)
- ICE candidate and SDP offer/answer exchange
- Host controls for room state synchronization

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
- `PORT`: Server port (default: 3001)
- `REDIS_URL`: Upstash Redis connection URL
- `CORS_ORIGIN`: Comma-separated allowed origins

## Running Locally

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Deployment

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `cd signaling-server && npm install`
4. Set start command: `cd signaling-server && npm start`
5. Add environment variables from `.env.example`

### Railway

1. Create new project
2. Connect repository
3. Set root directory: `signaling-server`
4. Add environment variables
5. Deploy

## API Endpoints

- `GET /health` - Health check and server stats
- `GET /api/room/:roomId` - Get room information

## WebSocket Messages

### Client → Server

- `create-room` - Create new room
- `join-room` - Join existing room
- `leave-room` - Leave room
- `offer` - WebRTC offer
- `answer` - WebRTC answer
- `ice-candidate` - ICE candidate
- `room-state-update` - Update room state (host only)

### Server → Client

- `connected` - Connection confirmation with clientId
- `room-created` - Room creation confirmation
- `room-joined` - Room join confirmation
- `peer-joined` - New peer joined
- `peer-left` - Peer left
- `room-closed` - Room closed by host
- `room-state-changed` - Room state updated
- `offer`, `answer`, `ice-candidate` - WebRTC signaling

## STUN/TURN Configuration

The client should use:
- **STUN**: Google public STUN servers (free)
  - `stun:stun.l.google.com:19302`
  - `stun:stun1.l.google.com:19302`
  
- **TURN** (optional but recommended): Deploy coturn on VPS or use service like Twilio

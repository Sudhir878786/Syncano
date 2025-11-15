/**
 * WebRTC Signaling Server for Melodexa
 * Handles ICE/SDP exchange, room management, and peer coordination
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true
}));
app.use(express.json());

// Redis client for presence and ephemeral state
const redis = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? {
        rejectUnauthorized: false
    } : undefined,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

// In-memory maps for active connections
const clients = new Map(); // clientId -> WebSocket
const rooms = new Map();   // roomId -> Set of clientIds

/**
 * Generate a 5-digit room code
 */
function generateRoomCode() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

/**
 * Send message to a specific client
 */
function sendToClient(clientId, message) {
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    }
}

/**
 * Broadcast message to all peers in a room except sender
 */
function broadcastToRoom(roomId, senderId, message) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;
    
    for (const clientId of roomClients) {
        if (clientId !== senderId) {
            sendToClient(clientId, message);
        }
    }
}

/**
 * Broadcast message to all peers in a room including sender
 */
function broadcastToRoomAll(roomId, message) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;
    
    for (const clientId of roomClients) {
        sendToClient(clientId, message);
    }
}

/**
 * Get room info from Redis
 */
async function getRoomInfo(roomId) {
    try {
        const data = await redis.get(`room:${roomId}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting room info:', error);
        return null;
    }
}

/**
 * Save room info to Redis (7 days expiry)
 */
async function saveRoomInfo(roomId, roomData) {
    try {
        await redis.setex(`room:${roomId}`, 604800, JSON.stringify(roomData));
    } catch (error) {
        console.error('Error saving room info:', error);
    }
}

/**
 * Delete room from Redis
 */
async function deleteRoom(roomId) {
    try {
        await redis.del(`room:${roomId}`);
        rooms.delete(roomId);
    } catch (error) {
        console.error('Error deleting room:', error);
    }
}

/**
 * Add peer to room in Redis
 */
async function addPeerToRoom(roomId, peerId, username, isHost = false) {
    try {
        const roomInfo = await getRoomInfo(roomId);
        if (!roomInfo) return false;
        
        roomInfo.peers[peerId] = {
            username,
            isHost,
            joinedAt: Date.now()
        };
        
        await saveRoomInfo(roomId, roomInfo);
        return true;
    } catch (error) {
        console.error('Error adding peer to room:', error);
        return false;
    }
}

/**
 * Remove peer from room
 */
async function removePeerFromRoom(roomId, peerId) {
    try {
        const roomInfo = await getRoomInfo(roomId);
        if (!roomInfo) return null;
        
        const peer = roomInfo.peers[peerId];
        delete roomInfo.peers[peerId];
        
        // If host left, delete the room
        if (peer && peer.isHost) {
            await deleteRoom(roomId);
            return { deleted: true };
        }
        
        // Save updated room
        await saveRoomInfo(roomId, roomInfo);
        return { deleted: false, remainingPeers: Object.keys(roomInfo.peers) };
    } catch (error) {
        console.error('Error removing peer from room:', error);
        return null;
    }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    
    console.log(`🔌 Client connected: ${clientId}`);
    
    // Send client their ID
    ws.send(JSON.stringify({
        type: 'connected',
        clientId
    }));
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            console.log(`📨 Received from ${clientId}:`, message.type);
            
            switch (message.type) {
                case 'create-room':
                    await handleCreateRoom(ws, clientId, message);
                    break;
                    
                case 'join-room':
                    await handleJoinRoom(ws, clientId, message);
                    break;
                    
                case 'leave-room':
                    await handleLeaveRoom(clientId, message.roomId);
                    break;
                    
                case 'offer':
                    handleOffer(clientId, message);
                    break;
                    
                case 'answer':
                    handleAnswer(clientId, message);
                    break;
                    
                case 'ice-candidate':
                    handleIceCandidate(clientId, message);
                    break;
                    
                case 'room-state-update':
                    await handleRoomStateUpdate(clientId, message);
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('❌ Error handling message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message'
            }));
        }
    });
    
    ws.on('close', async () => {
        console.log(`🔌 Client disconnected: ${clientId}`);
        clients.delete(clientId);
        
        // Remove from all rooms
        for (const [roomId, roomClients] of rooms.entries()) {
            if (roomClients.has(clientId)) {
                await handleLeaveRoom(clientId, roomId);
            }
        }
    });
    
    ws.on('error', (error) => {
        console.error(`❌ WebSocket error for ${clientId}:`, error);
    });
});

/**
 * Handle create room request
 */
async function handleCreateRoom(ws, clientId, message) {
    const { username } = message;
    const roomId = generateRoomCode();
    
    // Create room in Redis
    const roomData = {
        roomId,
        hostId: clientId,
        peers: {
            [clientId]: {
                username,
                isHost: true,
                joinedAt: Date.now()
            }
        },
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        createdAt: Date.now()
    };
    
    await saveRoomInfo(roomId, roomData);
    
    // Add to local room map
    rooms.set(roomId, new Set([clientId]));
    
    ws.send(JSON.stringify({
        type: 'room-created',
        roomId,
        clientId,
        username,
        isHost: true
    }));
    
    console.log(`✅ Room created: ${roomId} by ${username}`);
}

/**
 * Handle join room request
 */
async function handleJoinRoom(ws, clientId, message) {
    const { roomId, username } = message;
    
    // Check if room exists
    const roomInfo = await getRoomInfo(roomId);
    if (!roomInfo) {
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Room not found'
        }));
        return;
    }
    
    // Add peer to room
    await addPeerToRoom(roomId, clientId, username, false);
    
    // Add to local room map
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(clientId);
    
    // Get updated room info
    const updatedRoomInfo = await getRoomInfo(roomId);
    
    // Send confirmation to joiner
    ws.send(JSON.stringify({
        type: 'room-joined',
        roomId,
        clientId,
        username,
        isHost: false,
        peers: updatedRoomInfo.peers,
        currentSong: updatedRoomInfo.currentSong,
        isPlaying: updatedRoomInfo.isPlaying,
        currentTime: updatedRoomInfo.currentTime
    }));
    
    // Notify existing peers
    broadcastToRoom(roomId, clientId, {
        type: 'peer-joined',
        peerId: clientId,
        username,
        peers: updatedRoomInfo.peers
    });
    
    console.log(`✅ ${username} joined room: ${roomId}`);
}

/**
 * Handle leave room request
 */
async function handleLeaveRoom(clientId, roomId) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;
    
    roomClients.delete(clientId);
    
    // Remove from Redis
    const result = await removePeerFromRoom(roomId, clientId);
    
    if (result && result.deleted) {
        // Room was deleted (host left)
        broadcastToRoomAll(roomId, {
            type: 'room-closed',
            message: 'Host left the room'
        });
        rooms.delete(roomId);
        console.log(`❌ Room deleted: ${roomId}`);
    } else if (result) {
        // Notify remaining peers
        broadcastToRoom(roomId, clientId, {
            type: 'peer-left',
            peerId: clientId,
            remainingPeers: result.remainingPeers
        });
    }
    
    // Clean up empty rooms
    if (roomClients.size === 0) {
        rooms.delete(roomId);
    }
}

/**
 * Handle WebRTC offer
 */
function handleOffer(senderId, message) {
    const { targetId, offer, roomId } = message;
    
    sendToClient(targetId, {
        type: 'offer',
        senderId,
        offer,
        roomId
    });
    
    console.log(`📞 Forwarded offer from ${senderId} to ${targetId}`);
}

/**
 * Handle WebRTC answer
 */
function handleAnswer(senderId, message) {
    const { targetId, answer, roomId } = message;
    
    sendToClient(targetId, {
        type: 'answer',
        senderId,
        answer,
        roomId
    });
    
    console.log(`📞 Forwarded answer from ${senderId} to ${targetId}`);
}

/**
 * Handle ICE candidate
 */
function handleIceCandidate(senderId, message) {
    const { targetId, candidate, roomId } = message;
    
    sendToClient(targetId, {
        type: 'ice-candidate',
        senderId,
        candidate,
        roomId
    });
    
    console.log(`🧊 Forwarded ICE candidate from ${senderId} to ${targetId}`);
}

/**
 * Handle room state updates (song changes, playback control)
 */
async function handleRoomStateUpdate(senderId, message) {
    const { roomId, stateUpdate } = message;
    
    // Update room state in Redis
    const roomInfo = await getRoomInfo(roomId);
    if (!roomInfo) return;
    
    // Only host can update room state
    if (roomInfo.hostId !== senderId) {
        sendToClient(senderId, {
            type: 'error',
            message: 'Only host can update room state'
        });
        return;
    }
    
    // Update state
    if (stateUpdate.currentSong !== undefined) {
        roomInfo.currentSong = stateUpdate.currentSong;
    }
    if (stateUpdate.isPlaying !== undefined) {
        roomInfo.isPlaying = stateUpdate.isPlaying;
    }
    if (stateUpdate.currentTime !== undefined) {
        roomInfo.currentTime = stateUpdate.currentTime;
    }
    
    await saveRoomInfo(roomId, roomInfo);
    
    // Broadcast to all peers
    broadcastToRoomAll(roomId, {
        type: 'room-state-changed',
        stateUpdate: {
            currentSong: roomInfo.currentSong,
            isPlaying: roomInfo.isPlaying,
            currentTime: roomInfo.currentTime,
            timestamp: Date.now()
        }
    });
    
    console.log(`🔄 Room state updated: ${roomId}`);
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        clients: clients.size,
        rooms: rooms.size,
        redis: redis.status
    });
});

// Get room info endpoint
app.get('/api/room/:roomId', async (req, res) => {
    try {
        const roomInfo = await getRoomInfo(req.params.roomId);
        if (!roomInfo) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(roomInfo);
    } catch (error) {
        console.error('Error fetching room info:', error);
        res.status(500).json({ error: 'Failed to fetch room info' });
    }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Signaling server running on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('📴 SIGTERM received, closing server...');
    server.close(() => {
        console.log('✅ Server closed');
        redis.disconnect();
        process.exit(0);
    });
});

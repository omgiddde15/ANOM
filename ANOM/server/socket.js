/**
 * socket.js
 * Socket.IO real-time chat — JWT auth, matched-users-only messaging.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { areUsersMatched } = require('./models/interestStore');
const { saveMessage, conversationId } = require('./models/messageStore');
const { createNotification } = require('./models/notificationStore');
const { getProfile } = require('./models/profileStore');

/** @type {Map<string, Set<string>>} userId → socket ids */
const onlineUsers = new Map();
let ioInstance = null;

function addOnlineUser(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function removeOnlineUser(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
    return false;
  }
  return true;
}

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

function broadcastMessage(message) {
  if (!ioInstance) return;
  const room = `conv:${conversationId(message.senderId, message.recipientId)}`;
  ioInstance.to(room).emit('message:new', message);
  ioInstance.to(room).emit('new-message', message);
  ioInstance.to(`user:${message.recipientId}`).emit('message:notify', {
    message,
    partnerId: message.senderId,
  });
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        'http://localhost:5174',
      ],
      credentials: true,
    },
  });
  ioInstance = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    addOnlineUser(userId, socket.id);

    socket.join(`user:${userId}`);
    io.emit('user:online', { userId });

    socket.on('presence:check', ({ partnerId }, ack) => {
      if (typeof ack === 'function') {
        ack({ online: isUserOnline(partnerId) });
      }
    });

    socket.on('join_conversation', async ({ partnerId }, ack) => {
      try {
        if (!partnerId) {
          throw new Error('partnerId is required');
        }

        const matched = await areUsersMatched(userId, partnerId);
        if (!matched) {
          throw new Error('Not matched with this user');
        }

        const room = `conv:${conversationId(userId, partnerId)}`;
        socket.join(room);

        if (typeof ack === 'function') {
          ack({ success: true, partnerOnline: isUserOnline(partnerId) });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ success: false, message: err.message });
        }
      }
    });

    socket.on('send_message', async ({ recipientId, text }, ack) => {
      try {
        const trimmed = String(text || '').trim();
        if (!recipientId || !trimmed) {
          throw new Error('recipientId and text are required');
        }

        const matched = await areUsersMatched(userId, recipientId);
        if (!matched) {
          throw new Error('You can only message matched users');
        }

        const message = await saveMessage({
          senderId: userId,
          recipientId,
          text: trimmed,
        });

        broadcastMessage(message);

        // Send notification
        const senderProfile = await getProfile(userId);
        const senderName = senderProfile?.name || 'Someone';
        const notification = await createNotification({
          recipientUserId: recipientId,
          senderUserId: userId,
          type: 'message',
          title: 'New Message',
          message: `${senderName}: ${trimmed}`
        });
        ioInstance.to(`user:${recipientId}`).emit('notification:new', notification);

        if (typeof ack === 'function') {
          ack({ success: true, message });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ success: false, message: err.message });
        }
      }
    });

    socket.on('typing', async ({ recipientId, isTyping }) => {
      if (!recipientId) return;

      const matched = await areUsersMatched(userId, recipientId);
      if (!matched) return;

      io.to(`user:${recipientId}`).emit('typing', {
        userId,
        isTyping: !!isTyping,
      });
    });

    socket.on('disconnect', () => {
      const stillOnline = removeOnlineUser(userId, socket.id);
      if (!stillOnline) {
        io.emit('user:offline', { userId });
      }
    });
  });

  return io;
}

module.exports = { initSocket, isUserOnline, broadcastMessage, ioInstance };

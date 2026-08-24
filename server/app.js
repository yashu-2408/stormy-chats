const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');
const languages = require('./languages');
const { translateText, detectLanguage } = require('./translator');
const { sendPushNotification } = require('./notifications');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-chatapp-key';

function createApp(dbInstance = null) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Helper middleware for database access
  const withDb = async (req, res, next) => {
    try {
      req.db = dbInstance || await getDb();
      next();
    } catch (err) {
      res.status(500).json({ error: 'Database connection failed' });
    }
  };

  // Auth Middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Health check & Supported languages
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/languages', (req, res) => res.json(languages));

  // User Registration
  app.post('/api/auth/register', withDb, async (req, res) => {
    const { email, password, username, preferred_language, avatar } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    try {
      const existing = await req.db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userLang = preferred_language || 'en';
      const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;

      const result = await req.db.run(
        'INSERT INTO users (email, password_hash, username, preferred_language, avatar) VALUES (?, ?, ?, ?, ?)',
        [email.toLowerCase().trim(), hashedPassword, username, userLang, userAvatar]
      );

      const userId = result.lastID;
      const token = jwt.sign({ id: userId, email: email.toLowerCase().trim(), username }, JWT_SECRET, { expiresIn: '30d' });

      const newUser = {
        id: userId,
        email: email.toLowerCase().trim(),
        username,
        preferred_language: userLang,
        avatar: userAvatar
      };

      res.status(201).json({ token, user: newUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // User Login
  app.post('/api/auth/login', withDb, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const user = await req.db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

      const userData = {
        id: user.id,
        email: user.email,
        username: user.username,
        preferred_language: user.preferred_language,
        avatar: user.avatar,
        push_token: user.push_token
      };

      res.json({ token, user: userData });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Verify Session / Me
  app.get('/api/auth/me', withDb, authenticateToken, async (req, res) => {
    try {
      const user = await req.db.get(
        'SELECT id, email, username, preferred_language, avatar, push_token FROM users WHERE id = ?',
        [req.user.id]
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update User Profile / Settings
  app.put('/api/user/profile', withDb, authenticateToken, async (req, res) => {
    const { username, preferred_language, avatar, push_token } = req.body;
    try {
      const user = await req.db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const updatedUsername = username || user.username;
      const updatedLang = preferred_language || user.preferred_language;
      const updatedAvatar = avatar || user.avatar;
      const updatedPushToken = push_token !== undefined ? push_token : user.push_token;

      await req.db.run(
        'UPDATE users SET username = ?, preferred_language = ?, avatar = ?, push_token = ? WHERE id = ?',
        [updatedUsername, updatedLang, updatedAvatar, updatedPushToken, req.user.id]
      );

      const updatedUser = {
        id: req.user.id,
        email: user.email,
        username: updatedUsername,
        preferred_language: updatedLang,
        avatar: updatedAvatar,
        push_token: updatedPushToken
      };

      res.json({ user: updatedUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Users List (for searching and creating 1-on-1 chats)
  app.get('/api/users', withDb, authenticateToken, async (req, res) => {
    try {
      const users = await req.db.all(
        'SELECT id, email, username, preferred_language, avatar FROM users WHERE id != ? ORDER BY username ASC',
        [req.user.id]
      );
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create 1-on-1 or Group Chat
  app.post('/api/chats', withDb, authenticateToken, async (req, res) => {
    const { participant_ids, name, is_group } = req.body;

    if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'participant_ids array required' });
    }

    const allParticipants = Array.from(new Set([...participant_ids, req.user.id]));

    try {
      // If 1-on-1, check if chat already exists
      if (!is_group && allParticipants.length === 2) {
        const otherUserId = allParticipants.find(id => id !== req.user.id);
        const existingChat = await req.db.get(`
          SELECT c.id FROM chats c
          JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = ?
          JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = ?
          WHERE c.is_group = 0
        `, [req.user.id, otherUserId]);

        if (existingChat) {
          return res.json({ chat_id: existingChat.id, existing: true });
        }
      }

      const chatName = name || (is_group ? 'Group Chat' : 'Direct Message');
      const result = await req.db.run(
        'INSERT INTO chats (name, is_group, created_by) VALUES (?, ?, ?)',
        [chatName, is_group ? 1 : 0, req.user.id]
      );
      const chatId = result.lastID;

      for (const pId of allParticipants) {
        await req.db.run(
          'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
          [chatId, pId]
        );
      }

      res.status(201).json({ chat_id: chatId, name: chatName, is_group: is_group ? 1 : 0 });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get User Chats
  app.get('/api/chats', withDb, authenticateToken, async (req, res) => {
    try {
      const chats = await req.db.all(`
        SELECT c.id, c.name, c.is_group, c.created_at,
               m.text AS last_message, m.created_at AS last_message_at
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chat_id
        LEFT JOIN messages m ON m.id = (
          SELECT id FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1
        )
        WHERE cp.user_id = ?
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
      `, [req.user.id]);

      // Enhance 1-on-1 chat titles with participant's name/avatar
      for (const chat of chats) {
        const participants = await req.db.all(`
          SELECT u.id, u.username, u.avatar, u.preferred_language
          FROM users u
          JOIN chat_participants cp ON u.id = cp.user_id
          WHERE cp.chat_id = ?
        `, [chat.id]);

        chat.participants = participants;
        if (!chat.is_group) {
          const other = participants.find(p => p.id !== req.user.id);
          if (other) {
            chat.display_name = other.username;
            chat.display_avatar = other.avatar;
          } else {
            chat.display_name = chat.name;
          }
        } else {
          chat.display_name = chat.name;
        }
      }

      res.json(chats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Messages in a Chat
  app.get('/api/chats/:chatId/messages', withDb, authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const userLang = req.query.lang;

    try {
      // Check participant
      const participant = await req.db.get(
        'SELECT * FROM chat_participants WHERE chat_id = ? AND user_id = ?',
        [chatId, req.user.id]
      );
      if (!participant) {
        return res.status(403).json({ error: 'Access denied' });
      }

      let targetLang = userLang;
      if (!targetLang) {
        const currentUser = await req.db.get('SELECT preferred_language FROM users WHERE id = ?', [req.user.id]);
        targetLang = currentUser ? currentUser.preferred_language : 'en';
      }

      const messages = await req.db.all(`
        SELECT m.id, m.chat_id, m.sender_id, m.text, m.detected_language, m.client_msg_id, m.created_at,
               u.username AS sender_name, u.avatar AS sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.id ASC
      `, [chatId]);

      // Attach translation for target language
      const enrichedMessages = await Promise.all(messages.map(async (msg) => {
        let translation = msg.text;
        if (targetLang && targetLang !== msg.detected_language) {
          const transResult = await translateText(req.db, msg.id, msg.text, targetLang, msg.detected_language);
          translation = transResult.translatedText;
        }

        return {
          ...msg,
          translated_text: translation,
          target_language: targetLang
        };
      }));

      res.json(enrichedMessages);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Translate specific message on-demand
  app.post('/api/messages/:id/translate', withDb, authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { target_language } = req.body;

    if (!target_language) {
      return res.status(400).json({ error: 'target_language is required' });
    }

    try {
      const msg = await req.db.get('SELECT * FROM messages WHERE id = ?', [id]);
      if (!msg) return res.status(404).json({ error: 'Message not found' });

      const transResult = await translateText(req.db, msg.id, msg.text, target_language, msg.detected_language);
      res.json({
        message_id: Number(id),
        original_text: msg.text,
        detected_language: msg.detected_language,
        target_language,
        translated_text: transResult.translatedText
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Socket.IO Real-Time Messaging & Notifications ---
  io.on('connection', (socket) => {
    socket.on('join_chat', (data) => {
      const chatId = typeof data === 'object' ? data.chatId : data;
      const userId = typeof data === 'object' ? data.userId : null;

      socket.join(`chat_${chatId}`);
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('leave_chat', (data) => {
      const chatId = typeof data === 'object' ? data.chatId : data;
      socket.leave(`chat_${chatId}`);
    });

    socket.on('send_message', async (data, callback) => {
      const { chatId, senderId, text, clientMsgId } = data;
      if (!chatId || !senderId || !text) {
        if (callback) callback({ error: 'chatId, senderId, and text are required' });
        return;
      }

      try {
        const db = dbInstance || await getDb();

        const sender = await db.get('SELECT username, avatar FROM users WHERE id = ?', [senderId]);
        if (!sender) {
          if (callback) callback({ error: 'Sender not found' });
          return;
        }

        const detectedLang = await detectLanguage(text);

        const result = await db.run(
          'INSERT INTO messages (chat_id, sender_id, text, detected_language, client_msg_id) VALUES (?, ?, ?, ?, ?)',
          [chatId, senderId, text, detectedLang, clientMsgId || null]
        );
        const messageId = result.lastID;

        const participants = await db.all(`
          SELECT u.id, u.username, u.preferred_language, u.push_token
          FROM users u
          JOIN chat_participants cp ON u.id = cp.user_id
          WHERE cp.chat_id = ?
        `, [chatId]);

        const baseMsg = {
          id: messageId,
          chat_id: Number(chatId),
          sender_id: Number(senderId),
          sender_name: sender.username,
          sender_avatar: sender.avatar,
          text,
          detected_language: detectedLang,
          client_msg_id: clientMsgId,
          created_at: new Date().toISOString()
        };

        // Broadcast user-tailored translation to each participant individually
        for (const p of participants) {
          let translatedText = text;
          if (p.preferred_language && p.preferred_language !== detectedLang) {
            const trans = await translateText(db, messageId, text, p.preferred_language, detectedLang);
            translatedText = trans.translatedText;
          }

          const userMsgPayload = {
            ...baseMsg,
            translated_text: translatedText,
            target_language: p.preferred_language || 'en'
          };

          // Send to recipient's specific room if available, or room
          io.to(`user_${p.id}`).emit('new_message', userMsgPayload);

          // Fallback to chat room broadcast if user hasn't registered a user room
          if (!io.sockets.adapter.rooms.has(`user_${p.id}`)) {
            io.to(`chat_${chatId}`).emit('new_message', userMsgPayload);
          }

          // Push Notification
          if (p.id !== Number(senderId) && p.push_token) {
            sendPushNotification(
              p.push_token,
              sender.username,
              translatedText || text,
              { chatId, messageId }
            );
          }
        }

        if (callback) callback({ success: true, message: baseMsg });
      } catch (err) {
        console.error('Socket send_message error:', err);
        if (callback) callback({ error: err.message });
      }
    });
  });

  return { app, server, io };
}

module.exports = { createApp };

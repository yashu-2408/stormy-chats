# System Architecture & Implementation Guide

This document details the system architecture, real-time message flow, component layout, and hosting configuration for **ChatApp with Auto-Translation**.

---

## Architecture Overview

ChatApp uses a decoupled **Client-Server Architecture**:
1. **Client**: Cross-platform React Native app powered by Expo. Manages UI screens, authentication, Socket.IO real-time communication, offline message queueing in `AsyncStorage`, and translation toggles.
2. **Backend**: Node.js & Express server hosted on Replit with Socket.IO and SQLite database. Handles user authentication, message storage, auto-language detection, translation caching, and push notification dispatch.

```
┌─────────────────────────────────────────────────────────┐
│                   React Native / Expo Client            │
│  [AuthContext] ─── [ChatListScreen] ─── [ChatScreen]    │
│         │                                    │          │
│         │ AsyncStorage                       │ Socket   │
│         ▼ (Offline Queue & Local Cache)      ▼ & REST   │
└─────────┬────────────────────────────────────┬──────────┘
          │                                    │
          │             HTTP / WebSockets      │
          └─────────────────┬──────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Replit Backend Server                │
│  ┌──────────────┐   ┌───────────────┐  ┌─────────────┐  │
│  │ Express REST │   │ Socket.IO Server│  │ Push Engine │  │
│  └──────┬───────┘   └───────┬───────┘  └──────┬──────┘  │
│         │                   │                 │         │
│         └─────────┬─────────┴─────────────────┘         │
│                   │                                     │
│                   ▼                                     │
│         ┌───────────────────┐                           │
│         │ Translator Engine │                           │
│         └─────────┬─────────┘                           │
│                   │                                     │
│                   ▼                                     │
│         ┌───────────────────┐                           │
│         │ SQLite Database   │                           │
│         └───────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Authentication & Session Persistence

- **Hashing**: Passwords are securely hashed on register/login using `bcryptjs` with a cost factor of 10.
- **JWT Tokens**: Upon successful login or registration, the backend signs a JSON Web Token (JWT) valid for 30 days.
- **Client Session**: The token and user profile are saved in React Native `AsyncStorage`. On application boot, `AuthContext.js` verifies token validity via `GET /api/auth/me`.

---

## 2. Real-Time Messaging Flow (Socket.IO)

1. **Room Connection**:
   When opening a chat room (`ChatScreen.js`), the client connects to Socket.IO and emits:
   ```javascript
   socket.emit('join_chat', { chatId, userId });
   ```
   The server places the socket into `chat_${chatId}` and `user_${userId}`.

2. **Sending Messages**:
   When a user sends a message:
   - An optimistic local message object with a unique `client_msg_id` is appended to state.
   - The message payload is sent to the server via socket event `send_message`:
     ```javascript
     { chatId, senderId, text, clientMsgId }
     ```

3. **Backend Processing & User-Tailored Translation**:
   - The server detects the language of `text` using `detectLanguage()`.
   - The message is inserted into the `messages` table in SQLite.
   - The server fetches all chat participants.
   - For each participant `p`:
     - If `p.preferred_language` differs from `detected_language`, the server runs `translateText()`.
     - The message payload customized with `p.preferred_language` translation is emitted to `io.to('user_' + p.id)`.
     - If participant `p` is offline and has an Expo push token, `sendPushNotification()` dispatches an alert.

---

## 3. Auto-Translation & Caching Engine (`server/translator.js`)

To keep translation costs at **$0/month** and response times fast:

1. **Caching First**:
   Before querying external services, the server checks SQLite table `translations`:
   ```sql
   SELECT translated_text FROM translations WHERE message_id = ? AND target_language = ?
   ```
   If found, the cached result is returned instantly.

2. **Multi-Tier Fallback Provider**:
   - **Tier 1**: Google Translate free endpoint (`https://translate.googleapis.com/translate_a/single`).
   - **Tier 2**: MyMemory API fallback (`https://api.mymemory.translated.net/get`).
   - **Tier 3**: Local mock fallback formatting (`[ES] Hello world`) if offline.

3. **Caching Result**:
   Newly translated texts are saved to SQLite with a unique constraint on `(message_id, target_language)`.

---

## 4. Offline Queueing & Local Sync

1. **Network Disconnection**:
   If internet connection drops:
   - `ChatScreen.js` activates an offline banner.
   - Messages sent while offline are saved to an offline queue in `AsyncStorage` (`offline_queue_${chatId}`).

2. **Automatic Reconnection Sync**:
   When connectivity returns, Socket triggers the `'connect'` event and `checkOfflineQueue()` sends queued messages to the server.

---

## 5. Database Schema (`server/db.js`)

SQLite database (`chat.db`) schema:
- **`users`**: `id`, `email`, `password_hash`, `username`, `preferred_language`, `avatar`, `push_token`, `created_at`
- **`chats`**: `id`, `name`, `is_group`, `created_by`, `created_at`
- **`chat_participants`**: `chat_id`, `user_id`, `joined_at`
- **`messages`**: `id`, `chat_id`, `sender_id`, `text`, `detected_language`, `client_msg_id`, `created_at`
- **`translations`**: `id`, `message_id`, `target_language`, `translated_text`, `created_at` (`UNIQUE(message_id, target_language)`)

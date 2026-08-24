# System Architecture & Implementation Guide

This document details the internal working, data flow, component architecture, and implementation mechanics of the **ChatApp with Auto-Translation**.

---

## Architecture Overview

ChatApp uses a decoupled **Client-Server Architecture**:
1. **Client**: Cross-platform React Native app powered by Expo. Manages local UI state, authentication persistence, Socket.IO real-time communication, offline message queueing in `AsyncStorage`, and on-demand translation toggles.
2. **Backend**: Node.js & Express server with embedded Socket.IO engine and SQLite database. Handles user authentication, message storage, auto-language detection, translation caching, and push notification dispatch.

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
│                    Node.js Server                       │
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
   The server places the socket into two rooms: `chat_${chatId}` and `user_${userId}`.

2. **Sending Messages**:
   When a user types a message and hits send:
   - An optimistic local message object with a unique `client_msg_id` is appended to state.
   - The message payload is sent to the server via socket event `send_message`:
     ```javascript
     { chatId, senderId, text, clientMsgId }
     ```

3. **Backend Processing**:
   - The server detects the language of `text` using `detectLanguage()`.
   - The message is inserted into the `messages` table in SQLite.
   - The server fetches all chat participants.
   - For each participant `p`:
     - If `p.preferred_language` differs from `detected_language`, the server runs `translateText()`.
     - The message payload customized with `p.preferred_language` translation is emitted to `io.to('user_' + p.id)`.
     - If participant `p` is offline and has a registered Expo push token, `sendPushNotification()` sends an alert.

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
   - **Tier 3**: Local mock fallback formatting (`[ES] Hello world`) if offline or unreachable.

3. **Caching Result**:
   Newly translated texts are saved to SQLite with a unique constraint on `(message_id, target_language)` to guarantee duplicate queries are never repeated.

---

## 4. Offline Queueing & Local Sync

1. **Network Disconnection**:
   If the socket connection drops or HTTP requests fail:
   - `ChatScreen.js` activates an offline banner.
   - Messages sent while offline are given a `pending: true` flag and appended to an offline queue stored in `AsyncStorage` (`offline_queue_${chatId}`).

2. **Automatic Reconnection Sync**:
   When internet or socket connectivity is re-established:
   - Socket triggers the `'connect'` event.
   - `checkOfflineQueue()` reads `AsyncStorage`, sends queued messages sequentially to the server, and clears the queue upon receipt confirmation.

---

## 5. Database Schema (`server/db.js`)

The SQLite database (`chat.db`) contains 5 core tables:

1. **`users`**:
   - `id`, `email`, `password_hash`, `username`, `preferred_language`, `avatar`, `push_token`, `created_at`

2. **`chats`**:
   - `id`, `name`, `is_group`, `created_by`, `created_at`

3. **`chat_participants`**:
   - `chat_id`, `user_id`, `joined_at`

4. **`messages`**:
   - `id`, `chat_id`, `sender_id`, `text`, `detected_language`, `client_msg_id`, `created_at`

5. **`translations`**:
   - `id`, `message_id`, `target_language`, `translated_text`, `created_at`
   - *Constraint*: `UNIQUE(message_id, target_language)`

---

## 6. Frontend UI Screen Architecture

- **`App.js`**: Stack Navigator handling auth-guarded routing.
- **`AuthContext.js`**: React Context exposing `login`, `register`, `logout`, `updateUser`, and active `user` state.
- **`LoginScreen.js` & `RegisterScreen.js`**: User login and registration forms.
- **`ChatListScreen.js`**: List of active 1-on-1 and group chats, pull-to-refresh, modal for creating new chats or groups.
- **`ChatScreen.js`**: Message thread, real-time message bubble renders, original/translation toggle button, language badge, timestamp, and message input.
- **`SettingsScreen.js`**: Edit profile, avatar display, searchable 100+ language selector list.

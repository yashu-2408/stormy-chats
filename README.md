# ChatApp with Auto-Translation

A cross-platform mobile chat application (iOS & Android) with automatic real-time message translation across 100+ languages, offline message queueing, and ultra-low operating costs ($0-$15/month).

---

## Do You Need Any External API Keys?

**No paid API key is required to start running!**

The app is fully self-contained out of the box:
1. **Translation**: Uses a multi-tiered translation engine (Google Translate free GTX endpoint → MyMemory free translation endpoint → Local fallback) with SQLite database caching so translations are instant, reliable, and cost $0/month.
2. **Push Notifications**: Uses Expo Push Notification service which is completely free.
3. **Database & Auth**: Runs on local SQLite and JWT authentication—no external cloud DB required unless you scale up.

*(Optional)*: If you want dedicated enterprise translation volume in the future, you can add a Google Cloud Translation API key or DeepL key in `server/translator.js`.

---

## Features

- **Authentication**: Email & Password registration, login, JWT session persistence.
- **Messaging**: 1-on-1 chats and group chats powered by real-time Socket.IO communication.
- **Auto-Translation**: Automatic language detection of incoming messages and instant auto-translation to user's preferred language with SQLite translation caching.
- **Translation Controls**: Toggle between original and translated message text on-demand.
- **100+ Languages**: Supports ISO language codes (English, Spanish, French, Chinese, Japanese, Arabic, German, Hindi, etc.).
- **Offline Support**: Local message caching via `AsyncStorage` and automatic queueing/flushing upon network reconnection.
- **Push Notifications**: Integrated Expo Push Notification service for offline message alerts.
- **Minimal Operating Cost**: Built with zero mandatory SaaS dependencies ($0-$15/month).

---

## Project Structure

```
├── client/              # React Native / Expo Mobile App
│   ├── App.js           # Navigation setup
│   ├── AuthContext.js   # Auth state management & API hooks
│   ├── LoginScreen.js   # User Login
│   ├── RegisterScreen.js# User Registration
│   ├── ChatListScreen.js# Active chats & new chat modal
│   ├── ChatScreen.js    # Real-time chat & translation UI
│   ├── SettingsScreen.js# Profile & 100+ language selector
│   ├── app.json         # Expo configuration
│   └── eas.json         # EAS Build configuration for APKs
├── server/              # Node.js / Express Backend Server
│   ├── app.js           # Express app & Socket.IO handlers
│   ├── index.js         # Entry point & server startup
│   ├── db.js            # SQLite database schema & connection
│   ├── translator.js    # Translation engine with caching
│   ├── languages.js     # 100+ ISO language definitions
│   ├── notifications.js# Expo push notification sender
│   └── __tests__/       # Jest unit & integration test suite
└── README.md
```

---

## Local Development & Testing

### 1. Start Backend Server
```bash
cd server
npm install
npm start
```
*The server runs on `http://localhost:3000` and creates `chat.db` automatically.*

### 2. Start Mobile App
```bash
cd client
npm install
npm run web      # For Web browser preview
npm run android  # For Android emulator / Expo Go
npm run ios      # For iOS simulator
```

### 3. Run Test Suite
```bash
cd server
npm test
```

---

## Step-by-Step Guide: Hosting & Publishing APK

### Step 1: Deploy Backend Server (Free / Low-Cost)

You can host the Node.js backend on any free or low-cost cloud server provider:

#### Option A: Render.com / Railway.app (Free Tier)
1. Push your repository to GitHub.
2. Sign up at [Render.com](https://render.com) or [Railway.app](https://railway.app).
3. Create a **New Web Service** pointing to the `server/` directory.
4. Set Build Command: `npm install`
5. Set Start Command: `npm start`
6. Set Environment Variables:
   - `PORT`: `3000`
   - `JWT_SECRET`: `your-custom-secure-secret-key`
7. Copy your deployed server URL (e.g., `https://chatapp-server.onrender.com`).

#### Option B: DigitalOcean / VPS / AWS EC2 ($5/month)
1. Clone repo onto your Linux server.
2. Run using PM2 process manager:
   ```bash
   npm install -g pm2
   cd server
   npm install
   pm2 start index.js --name "chatapp-server"
   ```

---

### Step 2: Point Mobile App to Your Live Server

In `client/AuthContext.js`, update `API_URL` and `SOCKET_URL` with your live server domain:

```javascript
export const API_URL = 'https://chatapp-server.onrender.com/api';
export const SOCKET_URL = 'https://chatapp-server.onrender.com';
```

---

### Step 3: Build Standalone Android APK for Publishing

To build the downloadable `.apk` file for Android devices or Google Play Store:

1. Install Expo Application Services (EAS) CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo Account:
   ```bash
   eas login
   ```

3. Build APK:
   ```bash
   cd client
   eas build -p android --profile preview
   ```

4. Once completed, EAS will provide a direct download link for your standalone `.apk` file!

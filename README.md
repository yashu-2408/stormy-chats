# ChatApp with Auto-Translation

A cross-platform mobile chat application (iOS & Android) with automatic real-time message translation across 100+ languages, offline message queueing, and low operating costs ($0-$15/month).

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

## Tech Stack

- **Mobile App**: React Native, Expo, React Navigation, Socket.IO Client, AsyncStorage.
- **Backend Server**: Node.js, Express, Socket.IO, SQLite3 (`sqlite`), JWT, BcryptJS.
- **Translation Engine**: Auto-detection + multi-layer translation API with SQLite local database caching.

---

## Directory Structure

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

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm, yarn, or pnpm
- Expo Go app on mobile OR Android Studio / Xcode simulator

### 1. Run Backend Server

```bash
cd server
npm install
npm start
```
*The server will run on `http://localhost:3000` and create `chat.db` automatically.*

### 2. Run Mobile App

```bash
cd client
npm install
npm start
```

For web preview:
```bash
npm run web
```

For Android / iOS Expo Go:
```bash
npm run android
# or
npm run ios
```

---

## Running Tests

Run the backend test suite (unit tests for translation engine & caching + integration tests for Auth & Chat APIs):

```bash
cd server
npm test
```

---

## Building Android APK for Publishing

To build a standalone Android APK (`.apk`) using Expo Application Services (EAS):

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```bash
   eas login
   ```

3. Trigger APK build:
   ```bash
   cd client
   eas build -p android --profile preview
   ```

The build artifact (`.apk`) will be generated automatically and downloadable from your Expo dashboard.

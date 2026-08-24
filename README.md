# ChatApp with Auto-Translation

A cross-platform mobile chat application (iOS & Android) with automatic real-time message translation across 100+ languages, offline message queueing, and ultra-low operating costs ($0-$15/month).

---

## Direct Deployment on Render (1-Click Blueprint)

This project contains a `render.yaml` configuration that sets up your backend web service and persistent disk database automatically on Render.

### Option 1: Automatic Render Deployment via Blueprint
1. Push this repository to your GitHub account.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and configure:
   - Web Service (`server/`)
   - Persistent Disk (`/data` for SQLite database)
   - Auto-generated `JWT_SECRET`
6. Click **Apply**. Once built, Render will give you your backend URL (e.g. `https://chatapp-backend.onrender.com`).

---

### Option 2: Manual Render Deployment
If you prefer configuring Render manually through the dashboard UI:
1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Name**: `chatapp-backend`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Under **Environment Variables**, add:
   - `PORT`: `3000`
   - `JWT_SECRET`: *(Enter a long random secret string)*
   - `DB_PATH`: `/data/chat.db`
5. Under **Disks** (optional for data persistence across restarts):
   - Add Disk: Name `sqlite-data`, Mount Path `/data`, Size `1 GB`.
6. Click **Create Web Service**.

---

## Pointing Your Mobile App to Live Render URL

Once your Render backend service is live:

1. Open `client/AuthContext.js`.
2. Update the `API_URL` and `SOCKET_URL` variables with your Render URL:
   ```javascript
   export const API_URL = 'https://chatapp-backend.onrender.com/api';
   export const SOCKET_URL = 'https://chatapp-backend.onrender.com';
   ```

---

## Building Standalone Android APK for Publishing

To build the downloadable `.apk` file for Android devices or Google Play Store:

1. Install Expo Application Services (EAS) CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo Account:
   ```bash
   eas login
   ```

3. Trigger APK Build:
   ```bash
   cd client
   eas build -p android --profile preview
   ```

4. Download your `.apk` file directly from the link provided by EAS when completed.

---

## Local Development & Testing

### 1. Start Backend Server
```bash
cd server
npm install
npm start
```

### 2. Start Mobile App
```bash
cd client
npm install
npm run web      # Web browser preview
npm run android  # Android emulator / Expo Go
npm run ios      # iOS simulator
```

### 3. Run Test Suite
```bash
cd server
npm test
```

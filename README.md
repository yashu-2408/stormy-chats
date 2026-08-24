# ChatApp with Auto-Translation

A cross-platform mobile chat application (iOS & Android) with automatic real-time message translation across 100+ languages, offline message queueing, and ultra-low operating costs ($0-$15/month).

---

## Can You Host This Project on Netlify?

**Yes, for the Web Frontend!** Here is how Netlify fits into this architecture:

1. **Web Frontend Client (`client/`)**:
   - **Can be hosted on Netlify**. Netlify excels at static builds and single-page apps.
   - We have included a `client/netlify.toml` file.
   - When deployed to Netlify, it builds using `npx expo export -p web` and publishes the static web app.

2. **Backend Server (`server/`)**:
   - **Requires persistent WebSockets (Socket.IO) & SQLite database**, which serverless providers like Netlify Functions do not support natively for long-lived socket connections.
   - Therefore, the backend server should be hosted on **Render**, **Railway**, or a **VPS**, while the frontend client can run on **Netlify** (or as a native mobile app built via EAS).

---

## 🚀 Deployment Guide

### Step 1: Deploy Backend Server (Render / Railway / VPS)

#### Option A: Render 1-Click Blueprint (Recommended for Backend)
1. Push this repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com) → **New +** → **Blueprint**.
3. Connect your repository. Render automatically reads `render.yaml` and deploys the backend server with persistent SQLite disk storage.
4. Copy your live backend URL (e.g. `https://chatapp-backend.onrender.com`).

---

### Step 2: Deploy Web Frontend to Netlify

1. Log into [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Base directory**: `client`
   - **Build command**: `npx expo export -p web`
   - **Publish directory**: `client/dist`
4. Deploy site! Your web version of ChatApp will be live on Netlify.

*Note: Remember to set your live backend URL in `client/AuthContext.js`:*
```javascript
export const API_URL = 'https://chatapp-backend.onrender.com/api';
export const SOCKET_URL = 'https://chatapp-backend.onrender.com';
```

---

### Step 3: Build Standalone Android APK for Mobile Publishing

To generate a downloadable `.apk` file for Android devices:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login and build:
   ```bash
   cd client
   eas login
   eas build -p android --profile preview
   ```

3. Download your completed `.apk` file from the link provided by Expo.

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

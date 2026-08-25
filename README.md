# ChatApp with Auto-Translation

A mobile chat application (iOS & Android) featuring automatic real-time message translation across 100+ languages, offline message queueing, and zero-cost hosting setup via **Replit** for the backend and **EAS Build** for Android APK generation.

---

## 🚀 Replit Backend Hosting Guide (100% Free, No Credit Card)

### Step 1: Deploy Backend on Replit
1. Sign up/log in at [Replit.com](https://replit.com) using your GitHub account (No credit card required).
2. Click **Create Repl** → **Import from GitHub** → Select this repository.
3. Replit will automatically load the `.replit` configuration.
4. Click the **Run** button at the top. Replit will start the Node.js server and display a live HTTPS domain in the Webview panel (e.g. `https://chatapp-server.yourusername.repl.co`).

---

### Step 2: Connect Mobile App to Your Replit URL

Open `client/AuthContext.js` and update `API_URL` and `SOCKET_URL`:

```javascript
export const API_URL = 'https://chatapp-server.yourusername.repl.co/api';
export const SOCKET_URL = 'https://chatapp-server.yourusername.repl.co';
```

---

### Step 3: Build Standalone Android APK for Mobile

Generate a downloadable `.apk` file for Android devices using free Expo Application Services (EAS):

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo (Free, no credit card required):
   ```bash
   eas login
   ```

3. Trigger Android APK build:
   ```bash
   cd client
   eas build -p android --profile preview
   ```

4. Download your `.apk` file directly from the link provided by Expo when completed.

---

## 🛠️ Local Development & Testing

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

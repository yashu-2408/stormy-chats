# ChatApp with Auto-Translation

A cross-platform mobile chat application (iOS & Android) with automatic real-time message translation across 100+ languages, offline message queueing, and ultra-low operating costs ($0-$15/month).

---

## 💳 No Credit Card? 100% Free Backend Hosting Options

If you **do not have a credit card**, you can host your backend server for **100% free without entering any payment or card details** using any of these options:

### Option 1: Render.com Free Tier (No Credit Card Required)
- **Card Required?**: ❌ No!
- Render allows you to sign up using GitHub/Google and create free Node.js Web Services without entering credit card info.
- **Steps**:
  1. Log in to [Render.com](https://render.com) using your GitHub account.
  2. Click **New +** → **Blueprint** and select this GitHub repository.
  3. Render will deploy `render.yaml` automatically without asking for credit card details.
  4. Copy your backend URL: `https://chatapp-backend.onrender.com`.

---

### Option 2: Glitch / Replit (No Credit Card Required)
- **Card Required?**: ❌ No!
- **Glitch**:
  1. Go to [Glitch.com](https://glitch.com) (sign up with GitHub).
  2. Click **New Project** → **Import from GitHub** and enter your repo URL.
  3. Glitch will give you a live HTTPS backend URL immediately (e.g., `https://my-chatapp-server.glitch.me`).
- **Replit**:
  1. Go to [Replit.com](https://replit.com) (sign up with GitHub).
  2. Click **Create Repl** → **Import from GitHub**.
  3. Hit **Run** to get your instant HTTPS URL.

---

### Option 3: Koyeb / Zeabur (No Credit Card Required)
- **Card Required?**: ❌ No!
- [Koyeb](https://www.koyeb.com) and [Zeabur](https://zeabur.com) offer free Node.js hosting directly from GitHub repositories without requiring a credit card.

---

### Option 4: Self-Host via Cloudflare Tunnel (100% Free Home Hosting)
- **Card Required?**: ❌ No!
- You can host the backend on your own laptop/computer and expose it to the internet with a free, secure HTTPS domain using Cloudflare Tunnel:
  1. Run the backend server locally: `cd server && npm start`
  2. Download [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/):
     ```bash
     cloudflared tunnel --url http://localhost:3000
     ```
  3. Cloudflare will give you a free, public HTTPS URL (e.g. `https://random-words.trycloudflare.com`) that works worldwide on mobile devices!

---

## 🌐 Netlify Web Frontend Hosting

You can also host the **Web Frontend** on **Netlify** (100% free, no credit card needed):

1. Log in to [Netlify.com](https://app.netlify.com) using GitHub.
2. Click **Add new site** → **Import an existing project**.
3. Set **Base directory**: `client`, **Build command**: `npx expo export -p web`, **Publish directory**: `client/dist`.
4. Netlify will publish your web app with a free `.netlify.app` domain.

---

## 📱 Building Standalone Android APK for Mobile

To generate a downloadable `.apk` file for Android devices:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Login and build (Free Expo account, no credit card required):
   ```bash
   cd client
   eas login
   eas build -p android --profile preview
   ```

3. Download your completed `.apk` file directly from the link provided by Expo.

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

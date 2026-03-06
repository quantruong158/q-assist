# Angular Chat Template

A full-stack, modern chat application built with Angular 21, Genkit AI, and Firebase. Supports mobile via Capacitor and deploys to Firebase Hosting.

## 🚀 Key Features

- **Angular 21**: Modern frontend framework with signals.
- **Genkit AI**: Integrated AI flows using Google GenAI (Gemini).
- **Firebase**: Authentication, Firestore, Storage, and Cloud Functions.
- **Capacitor**: Cross-platform mobile support (iOS/Android).
- **Firebase Storage**: Secure image/file uploads.
- **Dark Mode**: Built-in theme support.

## 🛠️ Technology Stack

- **Framework**: Angular 21
- **AI Backend**: Genkit AI + Google GenAI
- **Database/Auth**: Firebase Firestore & Firebase Auth
- **File Storage**: Firebase Storage
- **Styling**: SCSS + Tailwind
- **Mobile**: Capacitor 8
- **Hosting**: Firebase Hosting

## ⚙️ Prerequisites

Before starting, ensure you have the following:

1. **Firebase Project**: Create a project at [Firebase Console](https://console.firebase.google.com/).
2. **Google AI API Key**: Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
3. **Firebase CLI**: Install with `npm install -g firebase-tools` and log in with `firebase login`.

## 📥 Getting Started

1. **Clone the repository**:

   ```bash
   git clone <your-repo-url>
   cd q-assist
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure Firebase secrets**:

   Set the Gemini API key as a Firebase secret:

   ```bash
   cd functions
   firebase functions:secrets:set GEMINI_API_KEY
   ```

   Or use the interactive prompt when deploying.

4. **Configure Environment Files**:

   - Copy `src/environments/environment.example.ts` to `src/environments/environment.ts` (and `.prod.ts`, `.mobile.ts`).
   - Fill in your Firebase configuration keys from the Firebase Console.

5. **Run the development server**:
   ```bash
   pnpm start
   ```

## 📱 Mobile Development (Capacitor)

1. **Build the mobile version**:

   ```bash
   pnpm run build:mobile
   ```

2. **Sync with Capacitor**:

   ```bash
   pnpm run cap:sync
   ```

3. **Open in IDE (Android Studio/Xcode)**:
   ```bash
   pnpm run cap:android
   # or
   pnpm run cap:ios
   ```

## 🚀 Deployment

### Firebase Hosting + Cloud Functions

1. **Build the Angular app**:

   ```bash
   pnpm run build
   ```

2. **Deploy to Firebase**:

   ```bash
   firebase deploy
   ```

   This deploys:
   - Hosting: `dist/q-assist/browser`
   - Functions: `functions/`
   - Firestore rules: `firestore.rules`
   - Storage rules: `storage.rules`

3. **Set secrets for production**:

   ```bash
   firebase functions:secrets:set GEMINI_API_KEY --production
   ```

### Running Emulators (Local Development)

Start all emulators:

```bash
firebase emulators:start
```

Start only functions emulator:

```bash
cd functions && pnpm run serve
```

## 📝 License

This project is licensed under the MIT License.

# Angular Chat Template

A full-stack, modern chat application template built with Angular 21, Genkit AI, and Firebase. This template supports SSR, mobile (via Capacitor), and is ready for deployment on Vercel.

## 🚀 Key Features

- **Angular 21 (SSR)**: High-performance server-side rendering.
- **Genkit AI**: Integrated AI flows using Google GenAI (Gemini).
- **Firebase**: Authentication and Firestore for real-time chat persistence.
- **Capacitor**: Cross-platform mobile support (iOS/Android).
- **Vercel Blob**: Fast and secure image/file uploads.
- **Angular Material**: Modern and responsive UI components.
- **Dark Mode**: Built-in theme support.

## 🛠️ Technology Stack

- **Framework**: Angular 21
- **AI Backend**: Genkit AI + Google GenAI
- **Database/Auth**: Firebase Firestore & Firebase Auth
- **File Storage**: Vercel Blob
- **Styling**: Angular Material + Scss
- **Mobile**: Capacitor 8
- **Hosting**: Vercel

## ⚙️ Prerequisites

Before starting, ensure you have the following:

1. **Firebase Project**: Create a project at [Firebase Console](https://console.firebase.google.com/).
2. **Google AI API Key**: Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
3. **Vercel Account**: For hosting and Vercel Blob storage.

## 📥 Getting Started

1. **Clone the repository**:

   ```bash
   git clone <your-repo-url>
   cd angular-chat-template
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:

   Create a `.env` file in the root directory:

   ```env
   GEMINI_API_KEY=your_gemini_api_key
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
   ```

   Configure Angular environment files:
   - Copy `src/environments/environment.example.ts` to `src/environments/environment.ts` (and `.prod.ts`, `.mobile.ts`).
   - Fill in your Firebase configuration keys.

4. **Run the development server**:
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

### Vercel (Web / SSR)

- Connect your repository to Vercel.
- The `vercel.json` file is pre-configured for Angular SSR.
- Ensure you set the `GEMINI_API_KEY` and `BLOB_READ_WRITE_TOKEN` in the Vercel dashboard env variables.

## 📝 License

This project is licensed under the MIT License.

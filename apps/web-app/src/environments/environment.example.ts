export const environment = {
  production: false,
  apiBaseUrl: '', // Deployment URL for mobile builds (e.g., https://your-app.vercel.app)
  firebase: {
    apiKey: 'your-api-key-here',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123',
    measurementId: 'G-ABCABCABCD',
  },
};

/*
 * To use this template:
 * 1. Copy this file to environment.ts, environment.prod.ts, and environment.mobile.ts
 * 2. Replace the placeholders with your actual Firebase configuration
 * 3. Set the apiBaseUrl for the mobile environment
 */

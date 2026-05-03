// ── Firebase Auth configuration ─────────────────────────────────────────────
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a project (or use an existing one)
// 3. Enable Authentication → Sign-in method → Email/Password
// 4. Go to Project Settings → Your apps → Add web app
// 5. Copy the config object below and replace the placeholder values
// 6. Set FIREBASE_CONFIGURED = true
//
// ADDING USERS (no public registration):
// Firebase Console → Authentication → Users → Add user
// Enter email (@fixy.com.ar) and a temporary password.
// The user will be prompted to change it via "Olvidé mi contraseña".
//
// AUTHORIZED DOMAINS (for GitHub Pages or custom domain):
// Firebase Console → Authentication → Settings → Authorized domains
// Add your GitHub Pages URL (e.g. tuusuario.github.io)
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_CONFIGURED = false; // ← cambiar a true cuando tengas el config listo

const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Auto-initializes if configured — do not modify below this line
if (FIREBASE_CONFIGURED && typeof firebase !== 'undefined') {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
}

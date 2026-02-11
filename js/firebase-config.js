// --- FIREBASE CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL CREDENTIALS FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyD40csyp5CtEHzwzv6QXCsjwKZXCf7guls",
    authDomain: "jarvis-website-sign-in-feature.firebaseapp.com",
    projectId: "jarvis-website-sign-in-feature",
    storageBucket: "jarvis-website-sign-in-feature.firebasestorage.app",
    messagingSenderId: "88057670607",
    appId: "1:88057670607:web:8a4448a53451cde24dc0ba",
    measurementId: "G-V04D48SN7P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
    firebase.analytics();
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

// --- AUTHENTICATION MODULE ---
import { auth, db } from './firebase-config.js';
import { showLoader, hideLoader, showPage, showToast } from './ui.js';
import { loadAppData } from './app.js';

let currentUser = null;
let userProfile = null;

export const getCurrentUser = () => currentUser;
export const getUserProfile = () => userProfile;

// --- INIT AUTH LISTENER ---
export function initAuth() {
    showLoader();
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await checkUserProfile(user.uid);
        } else {
            currentUser = null;
            userProfile = null;
            showPage('auth-overlay');
            hideLoader();
        }
    });
}

// --- CHECK PROFILE ---
async function checkUserProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            userProfile = doc.data();
            showPage('app-container');
            loadAppData(); // Trigger main app data load
        } else {
            // New user, needs role
            showPage('role-overlay');
            hideLoader();
        }
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        alert("Failed to load profile. Please refresh.");
        hideLoader();
    }
}

// --- GOOGLE SIGN IN ---
export async function signInWithGoogle() {
    showLoader();
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
        // Listener handles the rest
    } catch (error) {
        alert(error.message);
        hideLoader();
    }
}

// --- EMAIL SIGN UP ---
export async function signUpEmail(email, password, username) {
    showLoader();
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        // Temporarily store username in object for role selection step
        currentUser = cred.user;
        currentUser.tempUsername = username;
        // Listener fires, finds no doc, shows role overlay
    } catch (error) {
        alert(error.message);
        hideLoader();
    }
}

// --- EMAIL LOGIN ---
export async function loginEmail(email, password) {
    showLoader();
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        alert(error.message);
        hideLoader();
    }
}

// --- GUEST MODE ---
export function loginGuest() {
    currentUser = { uid: 'guest', isGuest: true };
    userProfile = {
        uid: 'guest',
        username: 'Guest User',
        role: 'taki', // Default
        isGuest: true
    };
    
    // Check if we have a saved role in local storage
    const savedRole = localStorage.getItem('guest_role');
    if (savedRole) {
        userProfile.role = savedRole;
        showPage('app-container');
        loadAppData();
    } else {
        showPage('role-overlay');
    }
    hideLoader();
}

// --- COMPLETE REGISTRATION ---
export async function completeRegistration(role) {
    showLoader();
    try {
        if (currentUser && currentUser.isGuest) {
            userProfile.role = role;
            localStorage.setItem('guest_role', role);
            showPage('app-container');
            loadAppData();
            hideLoader();
            return;
        }

        const username = document.getElementById('auth-username').value || currentUser.displayName || currentUser.tempUsername || "Diary User";
        const profile = {
            uid: currentUser.uid,
            username: username,
            email: currentUser.email,
            avatarUrl: currentUser.photoURL || '',
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(currentUser.uid).set(profile);
        userProfile = profile; // Update local state
        
        // Check for partner link in URL
        const urlParams = new URLSearchParams(window.location.search);
        const partnerId = urlParams.get('pair');
        if (partnerId) {
            await linkPartner(partnerId);
        }

        showPage('app-container');
        loadAppData();
    } catch (error) {
        console.error(error);
        alert("Registration failed: " + error.message);
        hideLoader();
    }
}

// --- LOGOUT ---
export async function logout() {
    showLoader();
    try {
        await auth.signOut();
        window.location.reload();
    } catch (e) {
        alert(e.message);
        hideLoader();
    }
}

// --- PARTNER LINKING ---
export async function linkPartner(partnerUid) {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({ partnerUid: partnerUid });
        // Also update partner's doc to point to us (bidirectional) - requires security rule permissions
        // For simplicity in this demo, we assume the partner will click our link too, or we handle logic appropriately
        alert("Partner Linked Successfully!");
    } catch (e) {
        console.error("Linking failed", e);
    }
}

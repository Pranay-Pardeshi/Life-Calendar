// --- MAIN APPLICATION LOGIC ---
import { initAuth, signInWithGoogle, loginEmail, signUpEmail, completeRegistration, logout, uploadAvatar, getCurrentUser, getUserProfile, loginGuest } from './auth.js';
import { fetchEntries, saveEntry } from './db.js';
import { getISTDate, checkSystemHealth } from './utils.js';
import { showPage } from './ui.js';

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initAuth(); // Starts the auth listener
    setupEventListeners();
    setupPWA();
    runClock();
});

// --- LOAD DATA ---
export function loadAppData() {
    // 1. Init Calendar Tear-off
    const ist = getISTDate();
    document.getElementById('tear-date').innerText = ist.getDate();
    document.getElementById('status-date').innerText = `Oct ${ist.getDate()}`; // Simplification
    
    // 2. Hide Tear-off after delay
    setTimeout(() => {
        document.getElementById('calendar-overlay').classList.add('torn');
        setTimeout(() => document.getElementById('calendar-overlay').style.display='none', 800);
    }, 1500);

    // 3. Update Profile UI
    const profile = getUserProfile();
    if (profile) {
        document.getElementById('profile-name').innerText = profile.username;
        document.getElementById('profile-email').innerText = profile.email || 'Guest Session';
        if(profile.avatarUrl) document.getElementById('settings-pfp').src = profile.avatarUrl;
        
        // Partner Link Generation
        const link = window.location.origin + "?pair=" + profile.uid;
        document.getElementById('invite-partner-btn').onclick = () => {
            prompt("Copy this link and send it to your partner:", link);
        };
    }

    // 4. Fetch Entries
    fetchEntries();
    
    // 5. Check Health
    checkSystemHealth();
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Auth
    document.getElementById('google-btn').onclick = signInWithGoogle;
    document.getElementById('guest-btn').onclick = loginGuest;
    
    document.getElementById('email-btn').onclick = () => {
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-username').value;
        const isSignup = document.getElementById('signup-fields').style.display === 'block';

        if(isSignup) signUpEmail(email, pass, name);
        else loginEmail(email, pass);
    };

    document.getElementById('auth-toggle').onclick = () => {
        const signup = document.getElementById('signup-fields');
        signup.style.display = signup.style.display === 'none' ? 'block' : 'none';
        document.getElementById('email-btn').innerText = signup.style.display === 'block' ? 'Sign Up' : 'Login';
    };

    // Role Selection
    document.querySelectorAll('.role-option').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.role-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
    });

    document.getElementById('confirm-role-btn').onclick = () => {
        const role = document.querySelector('.role-option.selected').dataset.role;
        completeRegistration(role);
    };

    // Navigation
    document.querySelectorAll('.segment').forEach(seg => {
        seg.onclick = () => {
            document.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${seg.dataset.view}`).classList.add('active');
        };
    });

    // Editor Moods
    document.querySelectorAll('.mood-icon').forEach(btn => {
        if(btn.id === 'cam-btn') return; // Skip camera
        btn.onclick = () => {
            document.querySelectorAll('.mood-icon').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
    });

    // Image Handling
    const camBtn = document.getElementById('cam-btn');
    const fileInput = document.getElementById('file-cam');
    let currentFile = null;

    camBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if(e.target.files[0]) {
            currentFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('preview-img').src = ev.target.result;
                document.getElementById('img-preview-area').style.display = 'block';
            };
            reader.readAsDataURL(currentFile);
        }
    };
    document.querySelector('.close-preview').onclick = () => {
        currentFile = null;
        document.getElementById('img-preview-area').style.display = 'none';
        fileInput.value = '';
    };

    // Save Entry
    document.getElementById('save-entry-btn').onclick = async () => {
        const title = document.getElementById('entry-title').value;
        const content = document.getElementById('entry-content').value;
        const moodBtn = document.querySelector('.mood-icon.selected');
        const mood = moodBtn ? moodBtn.dataset.mood : 'sun';
        
        if(!title || !content) return alert("Please write something!");

        const success = await saveEntry(title, content, mood, currentFile);
        if(success) {
            // Reset UI
            document.getElementById('entry-title').value = '';
            document.getElementById('entry-content').value = '';
            document.querySelector('.close-preview').click();
            document.querySelector('.segment[data-view="entries"]').click();
        }
    };

    // Settings & Modals
    document.getElementById('open-settings').onclick = () => showPage('settings-modal');
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => document.getElementById(b.closest('.overlay').id).style.display='none');
    document.getElementById('logout-btn').onclick = logout;

    // Avatar Upload
    document.getElementById('pfp-wrapper').onclick = () => document.getElementById('file-pfp').click();
    document.getElementById('file-pfp').onchange = async (e) => {
        if(e.target.files[0]) {
            const url = await uploadAvatar(e.target.files[0]);
            if(url) document.getElementById('settings-pfp').src = url;
        }
    };
    
    // Toggle Dark Mode
    document.getElementById('toggle-dark').onclick = () => {
        const isDark = document.documentElement.getAttribute('data-mode') === 'dark';
        document.documentElement.setAttribute('data-mode', isDark ? 'light' : 'dark');
    };
}

// --- CLOCK ---
function runClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = 
            `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        // IST Check for popup
        const ist = getISTDate();
        const next = new Date(ist); 
        next.setHours(24,0,0,0);
        const diff = next - ist;
        const h = Math.floor(diff/3600000);
        const m = Math.floor((diff%3600000)/60000);
        document.getElementById('timer-popup').innerText = `Timeline shift in ${h}h ${m}m`;

    }, 1000);
}

// --- PWA ---
function setupPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js');
        });
    }
}

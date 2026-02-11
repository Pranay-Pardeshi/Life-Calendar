// --- UI MANAGER ---
import { getUserProfile } from './auth.js';

// --- STATE HELPERS ---
export function showLoader() { document.getElementById('loader').style.display = 'flex'; }
export function hideLoader() { document.getElementById('loader').style.display = 'none'; }

export function showPage(pageId) {
    // Hide all overlays first
    document.querySelectorAll('.overlay').forEach(el => el.style.display = 'none');
    document.getElementById('calendar-overlay').style.display = 'none'; // Special case
    
    if (pageId === 'app-container') {
        document.getElementById('app-container').style.display = 'flex';
    } else {
        // It's an overlay
        document.getElementById(pageId).style.display = 'flex';
    }
}

export function showToast(show, message) {
    const popup = document.getElementById('swap-popup');
    if (show) {
        popup.innerHTML = `<i class="fas fa-exchange-alt"></i> ${message}`;
        popup.style.display = 'block';
    } else {
        popup.style.display = 'none';
    }
}

export function updateTheme(role) {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme');
    const newTheme = role === 'mitsuha' ? 'mitsuha' : null;

    if (currentTheme !== (newTheme || 'taki')) {
        // Trigger Glitch only if changing
        const app = document.getElementById('app-container');
        app.classList.add('glitch-effect');
        setTimeout(() => app.classList.remove('glitch-effect'), 400);
    }

    if (role === 'mitsuha') {
        root.setAttribute('data-theme', 'mitsuha');
    } else {
        root.removeAttribute('data-theme');
    }
}

// --- RENDERERS ---
export function renderEntries(entries) {
    const list = document.getElementById('entry-list');
    list.innerHTML = '';

    if (entries.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding: 40px; color:var(--text-sub); opacity:0.8;">No entries found in this timeline.</div>`;
        return;
    }

    entries.forEach(entry => {
        let icon = "sun";
        if (entry.mood.includes('rain')) icon = "cloud-rain";
        else if (entry.mood.includes('cloud')) icon = "cloud";
        else if (entry.mood.includes('moon')) icon = "moon";

        const el = document.createElement('div');
        el.className = 'entry-card';
        el.onclick = () => openReadModal(entry);
        
        // Anime Accurate Layout
        el.innerHTML = `
            <div class="date-col">
                <div class="date-big">${entry.date}</div>
                <div class="date-day">${entry.day}</div>
            </div>
            <div class="info-col">
                <div class="top-row">
                    <span>${entry.time}</span>
                    <span><i class="fas fa-${icon}"></i> ${entry.image ? '<i class="fas fa-paperclip"></i>' : ''}</span>
                </div>
                <div class="entry-title">${entry.title}</div>
                <div class="entry-preview">${entry.preview}</div>
            </div>
        `;
        list.appendChild(el);
    });
}

export function renderCalendar(entries) {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';
    
    // Headers
    ['S','M','T','W','T','F','S'].forEach(d => {
        grid.innerHTML += `<div style="font-size:10px; font-weight:700; color:#888;">${d}</div>`;
    });

    const now = new Date();
    // Simplified logic: Just assume current month for demo visuals (Oct 2013 style)
    // In real app, we'd use 'getISTDate' for the month header
    
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

    for(let i=0; i<firstDay; i++) grid.innerHTML += `<div></div>`;

    for(let i=1; i<=daysInMonth; i++) {
        const hasEntry = entries.some(e => parseInt(e.date) === i);
        const isToday = i === now.getDate();
        const div = document.createElement('div');
        div.className = `cal-cell ${hasEntry?'has-entry':''} ${isToday?'today':''}`;
        div.innerText = i;
        if(hasEntry) div.onclick = () => { /* Filter view logic could go here */ };
        grid.appendChild(div);
    }
}

// --- MODALS ---
import { deleteEntry } from './db.js';
import { getCurrentUser } from './auth.js';

function openReadModal(entry) {
    document.getElementById('read-title').innerText = entry.title;
    document.getElementById('read-content').innerText = entry.full;
    document.getElementById('read-date').innerText = `${entry.month} ${entry.date}`;
    
    const img = document.getElementById('read-img');
    if (entry.image) {
        img.src = entry.image;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }

    // Delete Button Logic
    const delBtn = document.getElementById('delete-entry-btn');
    const user = getCurrentUser();
    if (user && entry.author_uid === user.uid) {
        delBtn.style.visibility = 'visible';
        delBtn.onclick = () => {
            if(confirm("Delete this memory?")) {
                deleteEntry(entry.id, entry.image);
                document.getElementById('read-modal').style.display = 'none';
            }
        };
    } else {
        delBtn.style.visibility = 'hidden';
    }

    document.getElementById('read-modal').style.display = 'flex';
}

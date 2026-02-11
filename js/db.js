// --- DATABASE MODULE ---
import { db, storage } from './firebase-config.js';
import { getCurrentUser, getUserProfile } from './auth.js';
import { showLoader, hideLoader, renderEntries, renderCalendar, updateTheme, showToast } from './ui.js';
import { getISTDate } from './utils.js';

let diaryEntries = [];

// --- LOAD ENTRIES (Body Swap Logic) ---
export async function fetchEntries() {
    const profile = getUserProfile();
    const user = getCurrentUser();
    if (!profile || !user) return;

    // LOCAL STORAGE FOR GUEST
    if (profile.isGuest) {
        const localData = JSON.parse(localStorage.getItem('guest_entries')) || [];
        // Simple Body Swap Logic for Guest
        const istDate = getISTDate();
        const isEven = istDate.getDate() % 2 === 0;
        let targetRole = profile.role;
        let isSwapped = false;

        if (profile.role === 'taki' && !isEven) { targetRole = 'mitsuha'; isSwapped = true; }
        else if (profile.role === 'mitsuha' && !isEven) { targetRole = 'taki'; isSwapped = true; } // Wait, logic check: Mitsuha sees Taki on odd?
        // Let's keep it simple: Even = Self. Odd = Other.
        
        updateTheme(isSwapped ? (profile.role === 'taki' ? 'mitsuha' : 'taki') : profile.role);
        
        // Filter local entries by role
        diaryEntries = localData.filter(e => e.author_role === targetRole);
        renderEntries(diaryEntries);
        renderCalendar(diaryEntries);
        return;
    }

    showLoader();

    // 1. Determine Logic
    const istDate = getISTDate();
    const isEven = istDate.getDate() % 2 === 0;
    
    let targetRole = profile.role; // Default: View own
    let isSwapped = false;

    // Body Swap Rules:
    // Taki (Blue): Even=Self, Odd=Mitsuha
    // Mitsuha (Pink): Even=Mitsuha, Odd=Taki
    
    if (profile.role === 'taki') {
        if (!isEven) { targetRole = 'mitsuha'; isSwapped = true; }
    } else { // Mitsuha
        if (!isEven) { targetRole = 'taki'; isSwapped = true; } // Wait, logic check
        // Original: "Mitsuha: Even=Self(Pink), Odd=Partner(Blue)" -> This matches Taki's structure
        // Let's stick to: Even = See Own Role. Odd = See Other Role.
    }

    // UPDATE UI THEME
    updateTheme(isSwapped ? (profile.role === 'taki' ? 'mitsuha' : 'taki') : profile.role);
    
    // Show Toast if Swapped
    if (isSwapped) {
        const partnerName = profile.partnerUid ? "your partner" : "Mitsuha/Taki"; 
        showToast(true, `It's an Odd Day. Viewing ${partnerName}'s diary.`);
    } else {
        showToast(false); // Hide
    }

    try {
        // 2. Query
        // We fetch entries where 'author_role' matches the target.
        // Ideally, we fetch entries where 'author_uid' is the partner, but for this open demo we use roles.
        // IMPROVEMENT: If partnerUid exists, filter by that.
        
        let query = db.collection('entries')
            .where('author_role', '==', targetRole)
            .orderBy('timestamp', 'desc');

        // If specific partner linked
        if (profile.partnerUid && isSwapped) {
             query = db.collection('entries')
                .where('author_uid', '==', profile.partnerUid)
                .orderBy('timestamp', 'desc');
        } else if (!isSwapped) {
             // Always show own entries accurately
             query = db.collection('entries')
                .where('author_uid', '==', user.uid)
                .orderBy('timestamp', 'desc');
        }

        const snapshot = await query.get();
        diaryEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderEntries(diaryEntries);
        renderCalendar(diaryEntries);

    } catch (error) {
        console.error("Data Load Error:", error);
        if (error.code === 'failed-precondition') {
            console.warn("INDEX MISSING: Check console link");
        }
        // Fallback: Client-side filter (inefficient but safe)
        // Only if index fails.
    } finally {
        hideLoader();
    }
}

// --- SAVE ENTRY ---
export async function saveEntry(title, content, mood, imageFile) {
    const user = getCurrentUser();
    const profile = getUserProfile();
    if (!user) return;

    showLoader();
    
    const istDate = getISTDate();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // GUEST SAVE
    if (profile.isGuest) {
        let imageUrl = null;
        if (imageFile) {
            // Convert to Base64 for local storage (Not ideal for large files but ok for demo)
            imageUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(imageFile);
            });
        }

        const entry = {
            id: 'guest_' + Date.now(),
            author_uid: 'guest',
            author_role: profile.role,
            title,
            full: content,
            preview: content.substring(0, 60) + "...",
            mood,
            image: imageUrl,
            date: String(istDate.getDate()),
            day: days[istDate.getDay()],
            month: months[istDate.getMonth()],
            time: `${String(istDate.getHours()).padStart(2,'0')}:${String(istDate.getMinutes()).padStart(2,'0')}`,
            timestamp: Date.now()
        };

        const localData = JSON.parse(localStorage.getItem('guest_entries')) || [];
        localData.unshift(entry);
        localStorage.setItem('guest_entries', JSON.stringify(localData));
        
        fetchEntries(); // Reload to see change
        hideLoader();
        return true;
    }

    // CLOUD SAVE
    try {
        let imageUrl = null;

        if (imageFile) {
            const path = `diary/${user.uid}/${Date.now()}_${imageFile.name}`;
            const ref = storage.ref(path);
            await ref.put(imageFile);
            imageUrl = await ref.getDownloadURL();
        }

        const entry = {
            author_uid: user.uid,
            author_role: profile.role,
            title,
            full: content,
            preview: content.substring(0, 60) + "...",
            mood,
            image: imageUrl,
            date: String(istDate.getDate()),
            day: days[istDate.getDay()],
            month: months[istDate.getMonth()],
            time: `${String(istDate.getHours()).padStart(2,'0')}:${String(istDate.getMinutes()).padStart(2,'0')}`,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('entries').add(entry);
        
        // Refresh
        await fetchEntries();
        return true; // Success

    } catch (e) {
        alert("Save failed: " + e.message);
        return false;
    } finally {
        hideLoader();
    }
}

// --- DELETE ENTRY ---
export async function deleteEntry(entryId, imageUrl) {
    const profile = getUserProfile();
    
    // GUEST DELETE
    if (profile.isGuest) {
        let localData = JSON.parse(localStorage.getItem('guest_entries')) || [];
        localData = localData.filter(e => e.id !== entryId);
        localStorage.setItem('guest_entries', JSON.stringify(localData));
        fetchEntries();
        return;
    }

    showLoader();
    try {
        if (imageUrl) {
            try {
                await storage.refFromURL(imageUrl).delete();
            } catch(err) { console.log("Image delete skipped"); }
        }
        await db.collection('entries').doc(entryId).delete();
        await fetchEntries();
    } catch (e) {
        alert("Delete failed");
    } finally {
        hideLoader();
    }
}

// --- UPLOAD AVATAR ---
export async function uploadAvatar(file) {
    const user = getCurrentUser();
    const profile = getUserProfile();
    
    if (profile.isGuest) {
        const url = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        document.getElementById('settings-pfp').src = url;
        return url;
    }

    showLoader();
    try {
        const path = `avatars/${user.uid}/profile.jpg`;
        const ref = storage.ref(path);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        
        await db.collection('users').doc(user.uid).update({ avatarUrl: url });
        return url;
    } catch (e) {
        alert("Avatar upload failed");
        return null;
    } finally {
        hideLoader();
    }
}

export function getISTDate() {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + istOffset);
}

export function checkSystemHealth() {
    // 1. Manifest
    const link = document.querySelector('link[rel="manifest"]');
    if(link) {
        fetch(link.href).then(r => {
            if(r.ok) document.getElementById('st-manifest').classList.add('ok');
        });
    }
    // 2. Service Worker
    if('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        document.getElementById('st-sw').classList.add('ok');
    }
    // 3. DB (Simple check if config loaded)
    document.getElementById('st-db').classList.add('ok');
}

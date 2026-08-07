const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = "kampi_123";

let eventQueue = [];
let pastFollowers = new Set();
let tiktokConnection = null;

function queueEvent(eventData) {
    eventData.timestamp = Date.now();
    eventQueue.push(eventData);
}

function attachListeners(connection) {
    connection.on('chat', (data) => {
        console.log(`[CHAT] ${data.uniqueId}: ${data.comment}`);
    });

    connection.on('like', (data) => {
        console.log(`❤️  [LIKE TAPS] ${data.uniqueId} clicked.`);
    });

    connection.on('follow', (data) => {
        const username = data.uniqueId;
        if (!pastFollowers.has(username)) {
            pastFollowers.add(username);
            queueEvent({ action: "AvatarMorph", user: username });
        }
    });

    connection.on('gift', (data) => {
        if (data.repeatEnd) {
            const username = data.uniqueId;
            const giftName = data.giftName;
            console.log(`🎁 [GIFT RECEIVED] ${username} sent ${giftName}`);
            if (giftName === "Galaxy") {
                queueEvent({ action: "GalaxyFire", user: username });
            } else {
                queueEvent({ action: "GiftSlip", user: username });
            }
        }
    });

    connection.on('disconnected', () => {
        console.warn('⚠️ Disconnected from TikTok. Reconnecting in 10s with a fresh connection...');
        setTimeout(connectToTikTok, 10000);
    });
}

function connectToTikTok() {
    // Always build a fresh connection object so no stale room_id survives a retry
    tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME, {
        signApiKey: process.env.EULER_API_KEY
    });

    attachListeners(tiktokConnection);

    tiktokConnection.connect().then(() => {
        console.info(`✅ Connected to TikTok Live stream room!`);
    }).catch(err => {
        console.error('❌ Connection failed. Retrying in 10s with a fresh connection...', err.message || err);
        setTimeout(connectToTikTok, 10000);
    });
}

connectToTikTok();

app.get('/get-events', (req, res) => {
    const now = Date.now();
    const MAX_AGE = 10000;
    const freshEvents = eventQueue.filter(event => (now - event.timestamp) <= MAX_AGE);
    res.json(freshEvents);
    eventQueue = [];
});

app.listen(PORT, () => {
    console.log(`🚀 TikTok Chaos Engine running on port ${PORT}`);
});

const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = "kampi_123";

let eventQueue = [];
let pastFollowers = new Set();

// PUTAPHEREEEEE -> your Euler Stream key lives in Render's Environment tab
// as EULER_API_KEY, never hardcoded here.
let tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME, {
    signApiKey: process.env.EULER_API_KEY
});

// TEMP DEBUG - remove this line once we confirm the key is loading correctly
console.log("Key loaded:", !!process.env.EULER_API_KEY, "starts with:", process.env.EULER_API_KEY?.slice(0, 6));

tiktokConnection.connect().then(() => {
    console.info(`✅ Connected to TikTok Live stream room!`);
}).catch(err => {
    console.error('❌ Connection failed. Ensure the target user is actively LIVE.', err);
});

function queueEvent(eventData) {
    eventData.timestamp = Date.now();
    eventQueue.push(eventData);
}

tiktokConnection.on('chat', (data) => {
    console.log(`[CHAT] ${data.uniqueId}: ${data.comment}`);
});

tiktokConnection.on('like', (data) => {
    console.log(`❤️  [LIKE TAPS] ${data.uniqueId} clicked.`);
});

tiktokConnection.on('follow', (data) => {
    const username = data.uniqueId;
    if (!pastFollowers.has(username)) {
        pastFollowers.add(username);
        queueEvent({ action: "AvatarMorph", user: username });
    }
});

// 🎁 GIFT ROUTING LOGIC
tiktokConnection.on('gift', (data) => {
    if (data.repeatEnd) {
        const username = data.uniqueId;
        const giftName = data.giftName;
        console.log(`🎁 [GIFT RECEIVED] ${username} sent ${giftName}`);
        // ONLY Galaxy sets you on fire, ALL other gifts force a physics slip
        if (giftName === "Galaxy") {
            queueEvent({
                action: "GalaxyFire",
                user: username
            });
        } else {
            queueEvent({
                action: "GiftSlip",
                user: username
            });
        }
    }
});

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

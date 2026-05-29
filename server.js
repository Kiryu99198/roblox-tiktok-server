const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Target username
const TIKTOK_USERNAME = "thesaladtosser"; 

let eventQueue = [];
let pastFollowers = new Set(); 

let tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME);

tiktokConnection.connect().then(() => {
    console.info(`✅ Connected to TikTok Live stream room!`);
}).catch(err => {
    console.error('❌ Connection failed. Ensure the target user is actively LIVE.', err);
});

function queueEvent(eventData) {
    eventData.timestamp = Date.now();
    eventQueue.push(eventData);
}

// Chat Tracking Placeholder
tiktokConnection.on('chat', (data) => {
    console.log(`[CHAT] ${data.uniqueId}: ${data.comment}`);
});

// Like Tracking Placeholder
tiktokConnection.on('like', (data) => {
    console.log(`❤️  [LIKE TAPS] ${data.uniqueId} clicked.`);
});

// Follower Tracking -> Triggers Random Avatar Morph
tiktokConnection.on('follow', (data) => {
    const username = data.uniqueId;
    
    if (!pastFollowers.has(username)) {
        pastFollowers.add(username);
        console.log(`👑 [NEW FOLLOW] ${username} followed! Queuing Avatar Morph.`);
        
        queueEvent({ 
            action: "AvatarMorph", 
            user: username 
        });
    } else {
        console.log(`🚫 [ANTI-SPAM] Blocked duplicate follow morph for ${username}`);
    }
});

// 🎁 Gift Tracking -> Differentiates standard gifts from a Galaxy
tiktokConnection.on('gift', (data) => {
    if (data.repeatEnd) {
        const username = data.uniqueId;
        const giftName = data.giftName;

        console.log(`🎁 [GIFT RECEIVED] ${username} sent ${giftName} x${data.repeatCount}`);

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

// Roblox Polling Endpoint
app.get('/get-events', (req, res) => {
    const now = Date.now();
    const MAX_AGE = 10000;

    const freshEvents = eventQueue.filter(event => (now - event.timestamp) <= MAX_AGE);
    
    if (eventQueue.length > freshEvents.length) {
        console.log(`🧹 Cleared ${eventQueue.length - freshEvents.length} old offline events from the queue.`);
    }

    res.json(freshEvents);
    eventQueue = []; 
});

app.listen(PORT, () => {
    console.log(`🚀 TikTok Obby Chaos Engine running on port ${PORT}`);
});

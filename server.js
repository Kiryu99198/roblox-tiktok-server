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

// Helper function to push events with a timestamp
function queueEvent(eventData) {
    eventData.timestamp = Date.now();
    eventQueue.push(eventData);
}

// 1. Chat Tracking (Placeholder - We can configure this next!)
tiktokConnection.on('chat', (data) => {
    console.log(`[CHAT] ${data.uniqueId}: ${data.comment}`);
});

// 2. Like Tracking (Placeholder - We can configure this next!)
tiktokConnection.on('like', (data) => {
    console.log(`❤️  [LIKE TAPS] ${data.uniqueId} clicked.`);
});

// 3. Follower Tracking -> Triggers Random Avatar Morph (Anti-Spam Locked 🔒)
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

// 4. Gift Tracking (Placeholder - We can configure this next!)
tiktokConnection.on('gift', (data) => {
    if (data.repeatEnd) {
        console.log(`🎁 [GIFT RECEIVED] ${data.uniqueId} sent ${data.giftName} x${data.repeatCount}`);
    }
});

// Roblox Polling Endpoint with Auto-Expiration (10 seconds max age)
app.get('/get-events', (req, res) => {
    const now = Date.now();
    const MAX_AGE = 10000;

    const freshEvents = eventQueue.filter(event => (now - event.timestamp) <= MAX_AGE);
    
    if (eventQueue.length > freshEvents.length) {
        console.log(`扫 Cleared ${eventQueue.length - freshEvents.length} old offline events from the queue.`);
    }

    res.json(freshEvents);
    eventQueue = []; 
});

app.listen(PORT, () => {
    console.log(`🚀 TikTok Obby Chaos Engine running on port ${PORT}`);
});

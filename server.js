const { WebcastPushConnection } = require('tiktok-live-connector');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Target username
const TIKTOK_USERNAME = "thragg1832"; 

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
    eventData.timestamp = Date.now(); // Record exactly when this event happened
    eventQueue.push(eventData);
}

// 1. Chat Tracking ("spawn" text command -> 1 Zombie2)
tiktokConnection.on('chat', (data) => {
    const msg = data.comment.toLowerCase();
    console.log(`[CHAT] ${data.uniqueId}: ${data.comment}`);
    
    if (msg.includes("spawn")) {
        console.log(`🎯 [CHAT COMMAND] ${data.uniqueId} spawned a Zombie2!`);
        queueEvent({ action: "SpawnSingle", zombieType: "Zombie2", user: data.uniqueId });
    }
});

// 2. Like Tracking (10 Taps = 1 Zombie1)
let runningLikeCount = 0;
tiktokConnection.on('like', (data) => {
    runningLikeCount += data.likeCount;
    console.log(`❤️  [LIKE TAPS] ${data.uniqueId} clicked. Pool progress: ${runningLikeCount}/10`);
    
    while (runningLikeCount >= 10) {
        runningLikeCount -= 10;
        console.log(`🧟 [CONVERSION] 10 likes reached! Queuing 1 Zombie1.`);
        queueEvent({ action: "SpawnSingle", zombieType: "Zombie1", user: data.uniqueId });
    }
});

// 3. Follower Tracking (1 New Follow -> 1 Zombie2 + 10 Zombie1s = 11 Mobs Total)
tiktokConnection.on('follow', (data) => {
    const username = data.uniqueId;
    
    if (!pastFollowers.has(username)) {
        pastFollowers.add(username);
        console.log(`👑 [NEW FOLLOW] ${username} followed! Queuing 1 Zombie2 and 10 Zombie1s.`);
        
        queueEvent({ 
            action: "SpawnComboWave", 
            mainType: "Zombie2", 
            hordeType: "Zombie1", 
            hordeAmount: 10,
            totalAmount: 11,
            user: username 
        });
    } else {
        console.log(`🚫 [ANTI-SPAM] Blocked duplicate follow spawn for ${username}`);
    }
});

// 4. Gift Tracking (Any gift sent -> Spawns 1 Zombie3 per gift count)
tiktokConnection.on('gift', (data) => {
    if (data.repeatEnd) {
        console.log(`🎁 [GIFT RECEIVED] ${data.uniqueId} sent ${data.giftName} x${data.repeatCount}`);
        
        const calculatedAmount = 1 * data.repeatCount;
        
        queueEvent({ action: "SpawnHorde", zombieType: "Zombie3", amount: calculatedAmount, user: data.uniqueId });
    }
});

// Roblox Polling Endpoint with Auto-Expiration
app.get('/get-events', (req, res) => {
    const now = Date.now();
    const MAX_AGE = 10000; // 10 seconds in milliseconds

    // Filter out any events that are older than 10 seconds
    const freshEvents = eventQueue.filter(event => (now - event.timestamp) <= MAX_AGE);
    
    if (eventQueue.length > freshEvents.length) {
        console.log(`🧹 Cleared ${eventQueue.length - freshEvents.length} old offline events from the queue.`);
    }

    res.json(freshEvents);
    eventQueue = []; // Clear the main queue completely
});

app.listen(PORT, () => {
    console.log(`🚀 Balanced Multi-Zombie Engine running on port ${PORT}`);
});

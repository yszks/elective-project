// Agora Video SDK credentials
const APP_ID = "384b88429f6c4934bd13dae2a9c2a5ab";
const TOKEN = "007eJxTYIjb6F1X8sptrwLbEs/r/+acuMQ3jbWLsWfFOkUfzoI7eZ0KDMYWJkkWFiZGlmlmySaWxiZJKYbGKYmpRomWyUaJpolJJ0sNMhoCGRnerolnYWSAQBCfgyE1JzW5JLMslYEBALr1ISs=";
const CHANNEL = "elective";

let client;           // AgoraRTC client
let localTracks = [];  // Microphone and Camera tracks
let remoteUsers = {};  // Remote users map
let UID;               // Local user ID
let micPublished = false; // Track microphone status
let isCameraOn = true; // Track camera status
let username = 'Guest'; // Default username

// === Agora Video SDK ===
async function joinAndDisplayLocalStream() {
    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    client.enableAudioVolumeIndicator();

    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    UID = await client.join(APP_ID, CHANNEL, TOKEN, null);
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        },
        video: true
    });

    let player = `<div class="video-container" id="user-container-${UID}">
                    <div class="video-player" id="user-${UID}"></div>
                  </div>`;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${UID}`);
    await client.publish([localTracks[1]]); // Only publish camera at start

    await localTracks[0].setMuted(true); // Mute mic
    micPublished = false;

    // Load existing messages when joining
    loadMessages();

    // Voice detection - local user only
    setInterval(() => {
        if (!localTracks[0]) return;

        const level = localTracks[0].getVolumeLevel(); // 0.0 - 1.0
        const videoContainer = document.getElementById(`user-container-${UID}`);
        if (!videoContainer) return;

        if (level > 0.5) {
            videoContainer.style.border = "3px solid limegreen";
        } else {
            videoContainer.style.border = "";
        }

        console.log(`Local mic level: ${level.toFixed(2)}`);
    }, 200);

    client.on('volume-indicator', volumes => {
        volumes.forEach(user => {
            const uid = user.uid;
            const level = user.level; // 0.0 - 1.0

            const videoContainer = document.getElementById(`user-container-${uid}`);
            if (!videoContainer) return;

            if (level > 40) {
                videoContainer.style.border = "3px solid limegreen";
            } else {
                videoContainer.style.border = "";
            }
        });
    });
}

async function joinStream() {
    await joinAndDisplayLocalStream();
    document.getElementById('join-btn').style.display = 'none';
    document.getElementById('stream-controls').style.display = 'flex';
    document.getElementById('container-chat-btn').style.display = 'flex';
    document.getElementById('title').style.display = 'none';
    document.getElementById('logo-left').style.display = 'flex';
    document.getElementById('create-room-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
}

// Handle remote users publishing tracks
async function handleUserJoined(user, mediaType) {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                    <div class="video-player" id="user-${user.uid}"></div>
                  </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);

        // Mirror video
        document.getElementById(`user-${user.uid}`).style.transform = 'scaleX(-1)';
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
}

let leaveAndRemoveLocalStream = async () => {
    for (let i = 0; localTracks.length > i; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }

    await client.leave();
    document.getElementById('join-btn').style.display = 'block';
    document.getElementById('stream-controls').style.display = 'none';
    document.getElementById('video-streams').innerHTML = '';
    document.getElementById('container-chat-btn').style.display = 'none';
    document.getElementById('title').style.display = 'flex';
    document.getElementById('logo-left').style.display = 'none';
    document.getElementById('side-chat').style.display = 'none';
    document.getElementById('head-buttons').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'flex';
}

// === Chat Functions ===
async function sendMessage(message) {
    if (!username) {
        alert('Please enter your username.');
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, message })
        });
        if (!response.ok) throw new Error('Failed to send message');
        loadMessages(); // Reload messages after sending
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function loadMessages() {
    const roomId = 'yourRoomId'; // Replace with the actual room ID
    fetch(`http://localhost:3000/messages?roomId=${roomId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Process and display messages
            console.log(data);
        })
        .catch(error => {
            console.error('Error loading messages:', error);
            // Display error message to the user
        });
}


// === Microphone and Camera Control ===
let toggleMic = async (e) => {
    const button = e.currentTarget;

    if (!micPublished) {
        await client.publish([localTracks[0]]);
        micPublished = true;
        console.log("Mic published to the channel.");
    }

    const micTrack = localTracks[0];

    if (micTrack.muted) {
        await micTrack.setMuted(false);
        console.log("Mic unmuted");
        button.innerHTML = `
            <img src="public/assets/images/mic-on.png" alt="Mic On" class="mic-icon">
        `;
        button.style.backgroundColor = '#242424';
        document.getElementById('mute-icon').style.display = 'none';
    } else {
        await micTrack.setMuted(true);
        console.log("Mic muted");
        button.innerHTML = `
            <img src="public/assets/images/mic-off.png" alt="Mic Off" class="mic-icon">
        `;
        button.style.backgroundColor = '#FF8578';
        document.getElementById('mute-icon').style.display = 'flex';
    }
};

let toggleCamera = async (e) => {
    const button = e.currentTarget; // refers to the button, not the image

    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false);
        isCameraOn = true;
        button.innerHTML = `
            <img src="public/assets/images/camera-on.png" alt="Camera On" class="camera-icon">
        `;
        button.style.backgroundColor = '#A1FF99';
    } else {
        await localTracks[1].setMuted(true);
        isCameraOn = false;
        button.innerHTML = `
            <img src="public/assets/images/camera-off.png" alt="Camera Off" class="camera-icon">
        `;
        button.style.backgroundColor = '#242424';
    }
};

// === Chat Toggle ===
let toggleChat = async () => {
    document.getElementById('chat-cont').classList.toggle('show');
    document.getElementById('theme-toggle').classList.toggle('show');
    document.getElementById('x-btn-chat').classList.toggle('show');
}

let toggleClose = async () => {
    document.getElementById('chat-cont').classList.remove('show');
    document.getElementById('theme-toggle').classList.remove('show');
    document.getElementById('x-btn-chat').classList.remove('show');
}

// === Event Listeners ===
window.addEventListener('load', () => {
    document.getElementById('join-btn').addEventListener('click', joinStream);
    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);
    document.getElementById('chat-btn').addEventListener('click', toggleChat);
    document.getElementById('x-btn-chat').addEventListener('click', toggleClose);
    document.getElementById('send-btn').addEventListener('click', () => {
        const msgInput = document.getElementById('chat-input');
        sendMessage(msgInput.value);
        msgInput.value = '';
    });
    
    // Optionally, load messages periodically
    setInterval(loadMessages, 5000);
});

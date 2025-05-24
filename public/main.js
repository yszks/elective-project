// Agora Video SDK credentials
const APP_ID = "384b88429f6c4934bd13dae2a9c2a5ab";

let currentRoomId = null;
let client;           // AgoraRTC client
let localTracks = [];  // Microphone and Camera tracks
let remoteUsers = {};  // Remote users map
let UID;               // Local user ID
let micPublished = false; // Track microphone status
let isCameraOn = true; // Track camera status

// Function to fetch Agora token from your server
async function fetchAgoraToken(roomId) {
    try {
        // We'll let Agora assign the UID initially (null), so pass 0 to the server.
        // If you need a specific UID, you'd generate it client-side or receive it from your auth system.
        // For simplicity, passing 0 here.
        const response = await fetch(`https://elective-project.onrender.com/generate-agora-token?channelName=${roomId}&uid=0`); // Pass uid=0
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch Agora token: ${errorText}`);
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error fetching Agora token:', error);
        throw error; // Propagate the error to prevent joining without a token
    }
}

// === Agora Video SDK ===
async function joinAndDisplayLocalStream(roomId) {
    if (!roomId) {
        console.error("No Room ID provided to joinAndDisplayLocalStream.");
        return;
    }

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    client.enableAudioVolumeIndicator();

    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    // Use the dynamic roomId here
    UID = await client.join(APP_ID, roomId, TOKEN, null);
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

    // Display controls after joining a room
    document.getElementById('stream-controls').style.display = 'flex';
    document.getElementById('container-chat-btn').style.display = 'block';
    document.getElementById('title').style.display = 'none'; // Hide main title
    document.getElementById('logo-left').style.display = 'flex'; // Show left logo
    document.getElementById('head-buttons').style.display = 'none'; // Hide create/logout
    document.querySelector('.container-join-btn').style.display = 'none'; // Hide join buttons

    // Voice detection - local user only
    setInterval(() => {
        if (!localTracks[0]) return;

        const level = localTracks[0].getVolumeLevel(); // 0.0 - 1.0
        const videoContainer = document.getElementById(`user-container-${UID}`);
        if (!videoContainer) return;

        if (level > 0.05) { // Adjusted sensitivity
            videoContainer.style.border = "3px solid limegreen";
        } else {
            videoContainer.style.border = "";
        }
    }, 200);

    client.on('volume-indicator', volumes => {
        volumes.forEach(user => {
            const uid = user.uid;
            const level = user.level; // 0.0 - 1.0

            const videoContainer = document.getElementById(`user-container-${uid}`);
            if (!videoContainer) return;

            if (level > 40) { // Agora's volume indicator is 0-255
                videoContainer.style.border = "3px solid limegreen";
            } else {
                videoContainer.style.border = "";
            }
        });
    });

    // Load existing messages after successfully joining the room
    loadMessages(roomId);
}

function initializeUI() {
    const chatBtn = document.getElementById("chat-btn");
    const chatSidebar = document.getElementById("side-chat");
    const closeChatBtn = document.getElementById("x-btn-chat");

    if (chatBtn && chatSidebar && closeChatBtn) {
        chatBtn.addEventListener("click", () => {
            chatSidebar.style.display = "block";
        });

        closeChatBtn.addEventListener("click", () => {
            chatSidebar.style.display = "none";
        });
    }

    const sendBtn = document.getElementById("send-btn");
    const chatInput = document.getElementById("chat-input");

    // Ensure the chat input and send button are correctly wired up
    if (sendBtn && chatInput) {
        sendBtn.addEventListener("click", () => {
            const message = chatInput.value.trim();
            if (message && currentRoomId && username) { // Added username check
                sendMessage(currentRoomId, username, message);
                chatInput.value = '';
            }
        });
        // Allow sending messages with Enter key
        chatInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); // Prevent default Enter behavior (e.g., new line)
                sendBtn.click(); // Trigger send button click
            }
        });
    }
}


// Modify joinRoom to also trigger Agora.io stream
function joinRoom(roomId) {
    currentRoomId = roomId;
    socket.emit("join-room", { roomId, username });
    joinAndDisplayLocalStream(roomId); // Call Agora.io stream
    loadMessages(roomId); // Load messages after socket join
}

function registerEventHandlers() {
    socket.on("connect", () => {
        console.log("Connected to Socket.IO server");
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
    });
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
    // Agora.io cleanup
    for (let i = 0; localTracks.length > i; i++) {
        localTracks[i].stop();
        localTracks[i].close();
    }
    if (client) {
        await client.leave();
    }
    document.getElementById('video-streams').innerHTML = '';

    // Socket.IO cleanup (if connected to a room)
    if (currentRoomId) {
        // You might want to emit a 'leave-room' event to the server
        // so the server knows the user has explicitly left.
        // The server.js already handles `disconnect` for room cleanup,
        // but an explicit leave event could be useful for real-time updates to others.
        // socket.emit('leave-room', { roomId: currentRoomId, username: username });
        currentRoomId = null; // Clear the current room ID
    }

    // UI reset
    document.getElementById('stream-controls').style.display = 'none';
    document.getElementById('container-chat-btn').style.display = 'none';
    document.getElementById('title').style.display = 'flex';
    document.getElementById('logo-left').style.display = 'none';
    document.getElementById('side-chat').style.display = 'none';
    document.getElementById('head-buttons').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'flex';
    document.querySelector('.container-join-btn').style.display = 'flex'; // Show join buttons again
};

   async function checkActiveRooms() {
       try {
           const response = await fetch('get-rooms.php');
           if (!response.ok) throw new Error('Failed to fetch rooms');

           const rooms = await response.json();
           const joinButtonContainer = document.querySelector('.container-join-btn');

           // Clear existing buttons
           joinButtonContainer.innerHTML = '';

           // Create a button for each active room
           rooms.forEach(room => {
               const button = document.createElement('button');
               button.textContent = `Join ${room.name}`;
               button.onclick = () => joinRoom(room.id); // Call joinRoom with the room ID
               joinButtonContainer.appendChild(button);
           });
       } catch (error) {
           console.error('Error checking active rooms:', error);
       }
   }
   

// Call this function periodically or on page load
setInterval(checkActiveRooms, 5000); // Check every 5 seconds


const socket = io("https://elective-project.onrender.com");

let username = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = await fetchUsername();
        username = userData.username;

        initializeUI();
        registerEventHandlers();
    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Failed to fetch user data. Please log in again.");
        window.location.href = "login-page.php";
    }
});

async function fetchUsername() {
    const response = await fetch('get-username.php', {
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error("Failed to fetch username");
    }
    return await response.json();
}


// === create room ===
async function createRoom() {
    const roomName = prompt("Enter room name:");
    if (!roomName) return;

    try {
        const response = await fetch('https://elective-project.onrender.com/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create room: ${errorText}`);
        }

        const data = await response.json();
        alert(`Room created: ${data.roomName} (ID: ${data.roomId})`);
        // Automatically join the newly created room
        joinRoom(data.roomId);
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room: ' + error.message);
    }
}




async function leaveRoom(roomId) {
    const userId = UID;
    try {
        const response = await fetch('https://elective-project.onrender.com/leave-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, roomId })
        });
        if (!response.ok) throw new Error('Failed to leave room');
        alert('You have left the room.');
    } catch (error) {
        console.error('Error leaving room:', error);
        alert('Error leaving room: ' + error.message);
    }
}


// === Chat Functions ===
// === Chat Functions ===
function sendMessage(roomId, username, message) {
    fetch('https://elective-project.onrender.com/messages', { // Changed to absolute URL
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, username, message })
    })
        .then(res => {
            if (!res.ok) throw new Error("Failed to send message");
            appendMessage(username, message);
        })
        .catch(err => console.error("Error sending message:", err));
}

function loadMessages(roomId) {
    fetch(`https://elective-project.onrender.com/messages?roomId=${roomId}`) // Changed to absolute URL
        .then(response => response.json())
        .then(messages => {
            const messagesContainer = document.getElementById("messages");
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            messagesContainer.innerHTML = '';
            messages.forEach(msg => appendMessage(msg.username, msg.message));
        })
        .catch(err => console.error("Error loading messages:", err));
}

function appendMessage(sender, message) {
    const messagesContainer = document.getElementById("messages");
    const messageElement = document.createElement("div");
    messageElement.textContent = `${sender}: ${message}`;
    messagesContainer.appendChild(messageElement);
}

function systemMessage(msg) {
    const messagesContainer = document.getElementById("messages");
    const messageElement = document.createElement("div");
    messageElement.classList.add("system-message");
    messageElement.textContent = msg;
    messagesContainer.appendChild(messageElement);
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
            <img src="assets/images/mic-on.png" alt="Mic On" class="mic-icon">
        `;
        button.style.backgroundColor = '#242424';
        document.getElementById('mute-icon').style.display = 'none';
    } else {
        await micTrack.setMuted(true);
        console.log("Mic muted");
        button.innerHTML = `
            <img src="assets/images/mic-off.png" alt="Mic Off" class="mic-icon">
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
            <img src="assets/images/camera-on.png" alt="Camera On" class="camera-icon">
        `;
        button.style.backgroundColor = '#A1FF99';
    } else {
        await localTracks[1].setMuted(true);
        isCameraOn = false;
        button.innerHTML = `
            <img src="assets/images/camera-off.png" alt="Camera Off" class="camera-icon">
        `;
        button.style.backgroundColor = '#242424';
    }
};



// === Event Listeners ===
window.addEventListener('load', () => {
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            if (currentRoomId) joinRoom(currentRoomId);
        });
    }


    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);
    document.getElementById('send-btn').addEventListener('click', () => {
        const msgInput = document.getElementById('chat-input');
        const message = msgInput.value.trim();
        if (message && currentRoomId && username) {
            sendMessage(currentRoomId, username, message);
            msgInput.value = '';
        }
    });

    // Optionally, load messages periodically
    setInterval(() => {
        if (currentRoomId) loadMessages(currentRoomId);
    }, 5000);

});

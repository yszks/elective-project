// Agora Video SDK credentials
const APP_ID = window.AGORA_APP_ID;
const API_BASE_URL = window.API_BASE_URL;
const PHP_API_BASE_URL = window.PHP_API_BASE_URL;

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
client.enableAudioVolumeIndicator(); // Enable once

let localTracks = {
    audioTrack: null,
    videoTrack: null
};

let currentRoomId = null;
let remoteUsers = {};
let UID = null;
let micPublished = false;
let isCameraOn = true;
let TOKEN = null;

let username = null;
const socket = io(API_BASE_URL);


client.on('user-published', handleUserJoined);
client.on('user-left', handleUserLeft);
client.on('volume-indicator', volumes => {
    volumes.forEach(user => {
        const uid = user.uid;
        const level = user.level;

        const videoContainer = document.getElementById(`user-container-${uid}`);
        if (!videoContainer) return;

        if (level > 40) { // Agora's volume indicator is 0-255, so 40 is a good threshold
            videoContainer.style.border = "3px solid limegreen";
        } else {
            videoContainer.style.border = "";
        }
    });
});


// Function to fetch Agora token from your server
async function fetchAgoraToken(roomId, uid) {
    const url = `${API_BASE_URL}/generate-agora-token?channelName=${roomId}&uid=${uid || 0}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Network response was not ok:', response.status, errorText);
            throw new Error(`Failed to fetch Agora token from Node.js: ${errorText}`);
        }
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('Error fetching Agora token:', error);
        throw error;
    }
}

// === Agora Video SDK ===
async function joinAndDisplayLocalStream(roomIdFromDatabase) {
    if (!roomIdFromDatabase) {
        console.error("No Room ID provided to joinAndDisplayLocalStream.");
        return;
    }

    const agoraChannelName = String(roomIdFromDatabase);
    console.log(`Attempting to join Agora channel: ${agoraChannelName}`);


    try {

        TOKEN = await fetchAgoraToken(agoraChannelName, null);
        console.log("Fetched Agora Token:", TOKEN ? "Success" : "Failed"); // Log success/failure, not token itself
        if (!TOKEN) {
            console.error("Failed to get Agora Token. Aborting Agora join.");
            return;
        }

        const [newAudioTrack, newVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: true
        });
        localTracks.audioTrack = newAudioTrack;
        localTracks.videoTrack = newVideoTrack;
        console.log("Local tracks created. Audio readyState:", localTracks.audioTrack.readyState, "Video readyState:", localTracks.videoTrack.readyState);

        // Join the channel - use the globally defined 'client'
        UID = await client.join(APP_ID, agoraChannelName, TOKEN, null); // Let Agora assign UID for new joins
        console.log(`Agora client joined channel: ${agoraChannelName} with UID: ${UID}`);

        const localPlayerHtml = `<div class="video-container" id="user-container-${UID}">
                                    <div class="video-player local-video-player" id="user-${UID}"></div>
                                    <p class="username-overlay">${username}</p>
                                </div>`;
        document.getElementById('video-streams').innerHTML = localPlayerHtml; // Clear old and add new
        localTracks.videoTrack.play(`user-${UID}`); // Play video track using the property
        console.log("Local video track playing.");

        console.log("Attempting to publish video track.");
        await client.publish([localTracks.videoTrack]);
        console.log("Local video track published.");

        // Initial mic state (muted)
        await localTracks.audioTrack.setMuted(true);
        micPublished = false; // Ensure this flag is reset

        if (window.localVoiceDetectionInterval) {
            clearInterval(window.localVoiceDetectionInterval);
        }
        window.localVoiceDetectionInterval = setInterval(() => {
            // Check if track is a valid object and has getVolumeLevel method before calling
            if (localTracks.audioTrack && typeof localTracks.audioTrack.getVolumeLevel === 'function') {
                const level = localTracks.audioTrack.getVolumeLevel(); // 0.0 - 1.0
                const videoContainer = document.getElementById(`user-container-${UID}`);
                if (videoContainer) {
                    if (level > 0.05) {
                        videoContainer.style.border = "3px solid limegreen";
                    } else {
                        videoContainer.style.border = "";
                    }
                }
            }
        }, 200);


        // Display controls after joining a room (ensure this is done after Agora join is successful)
        document.getElementById('stream-controls').style.display = 'flex';
        document.getElementById('container-chat-btn').style.display = 'block';
        document.getElementById('title').style.display = 'none';
        document.getElementById('logo-left').style.display = 'flex';
        document.getElementById('head-buttons').style.display = 'none';
        document.querySelector('.container-join-btn').style.display = 'none';

        // Load existing messages
        loadMessages(roomIdFromDatabase);

    } catch (error) {
        console.error("Agora join/publish error in joinAndDisplayLocalStream:", error);
        // Clean up Agora state if an error occurs during join/publish
        if (UID !== null) { // If partially joined
            await leaveRoomAgoraAndSocket(); // Attempt to clean up
        }
        // Optionally, display a user-friendly error message
        alert("Failed to join video call. Please try again.");
    }
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

    if (sendBtn && chatInput) {
        sendBtn.addEventListener("click", () => {
            const message = chatInput.value.trim();
            if (message && currentRoomId && username) {
                sendMessage(currentRoomId, username, message);
                chatInput.value = '';
            }
        });
        chatInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                sendBtn.click();
            }
        });
    }
}



// Modify joinRoom to also trigger Agora.io stream
async function joinRoom(roomId) {
    if (currentRoomId && currentRoomId !== roomId) { // If already in a different room
        console.log(`User attempting to leave room ${currentRoomId} to join ${roomId}`);
        await leaveRoomAgoraAndSocket(); // Properly leave the previous room
    } else if (currentRoomId === roomId) {
        console.log(`Already in room ${roomId}. No action needed.`);
        return; // Don't re-join if already in the same room
    }

    currentRoomId = roomId; // Set the new current room ID
    socket.emit("join-room", { roomId, username });
    console.log(`Socket.IO attempting to join room: ${roomId}`);

    await joinAndDisplayLocalStream(roomId); // This will now prepare to join a fresh Agora channel
    console.log(`Agora client attempting to join channel: ${roomId}`);

    loadMessages(roomId);
}


function registerEventHandlers() {
    socket.on("connect", () => {
        console.log("Connected to Socket.IO server");
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from Socket.IO server");
    });

    socket.on("chat-message", (data) => {
        appendMessage(data.username, data.message);
    });

    socket.on("user-joined", (data) => {
        systemMessage(`${data.username} has joined the room.`);
    });

    socket.on("user-left", (data) => {
        systemMessage(`${data.username} has left the room.`);
    });

    socket.on('leave-room', ({ roomId }) => {
        console.log(`Received room-deleted event for room: ${roomId}. Updating UI.`);
        checkActiveRooms();
    });
}

// Handle remote users publishing tracks
async function handleUserJoined(user, mediaType) {
    await client.subscribe(user, mediaType);
    console.log(`User ${user.uid} published ${mediaType}`);

    // If it's a new video stream, create a player for it
    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (!player) { // Only add if container doesn't exist
            // No 'local-video-player' class for remote users, so it won't be mirrored
            player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                        <p class="username-overlay">${user.uid}</p>
                    </div>`; // You might need a way to get remote username here
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);
        }
        user.videoTrack.play(`user-${user.uid}`);
    }
    // If it's an audio stream, play it
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

function handleUserLeft(user) {
    console.log(`User ${user.uid} left`);
    const playerContainer = document.getElementById(`user-container-${user.uid}`);
    if (playerContainer) {
        playerContainer.remove();
    }
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
        socket.emit('leave-room', { roomId: currentRoomId, username: username });
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
        const response = await fetch(`${API_BASE_URL}/rooms`);
        if (!response.ok) throw new Error('Failed to fetch rooms');

        const rooms = await response.json();
        const joinButtonContainer = document.querySelector('.container-join-btn');

        // Clear existing buttons
        joinButtonContainer.innerHTML = '';

        // Create a button for each active room
        rooms.forEach(room => {
            const button = document.createElement('button');
            button.textContent = `Join ${room.room_name}`;
            button.onclick = () => joinRoom(room.id); // Call joinRoom with the room ID
            joinButtonContainer.appendChild(button);
        });
    } catch (error) {
        console.error('Error checking active rooms:', error);
    }
}


// Call this function periodically or on page load
setInterval(checkActiveRooms, 5000); // Check every 5 seconds


document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Use API_BASE_URL for the fetch call
        const userData = await fetchUsername();
        username = userData.username;

        initializeUI();
        registerEventHandlers();
        checkActiveRooms(); // Initial check for rooms
    } catch (error) {
        console.error("Initialization failed:", error);

        const messageBox = document.createElement('div');
        messageBox.textContent = "Failed to fetch user data. Please log in again.";
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
            padding: 15px; border-radius: 5px; z-index: 1000;
        `;
        document.body.appendChild(messageBox);
        setTimeout(() => {
            messageBox.remove();
            window.location.href = "public/login-page.php";
        }, 3000); // Display for 3 seconds then redirect
    }
});

async function fetchUsername() {
    const response = await fetch(`${PHP_API_BASE_URL}/public/get-username.php`, {
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
        const response = await fetch(`${API_BASE_URL}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomName })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create room: ${errorText}`);
        }

        const data = await response.json();
        const messageBox = document.createElement('div');
        messageBox.textContent = `Room created: ${data.roomName} (ID: ${data.roomId})`;
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #d4edda; color: #155724; border: 1px solid #c3e6cb;
            padding: 15px; border-radius: 5px; z-index: 1000;
        `;
        document.body.appendChild(messageBox);
        setTimeout(() => messageBox.remove(), 3000);

        await joinRoom(data.roomId);
        checkActiveRooms();
    } catch (error) {
        console.error('Error creating room:', error);
        const messageBox = document.createElement('div');
        messageBox.textContent = 'Error creating room: ' + error.message;
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
            padding: 15px; border-radius: 5px; z-index: 1000;
        `;
        document.body.appendChild(messageBox);
        setTimeout(() => messageBox.remove(), 3000);
    }
}



async function leaveRoomAgoraAndSocket(isErrorCleanup = false) {
    console.log("Initiating leave room process...");

    // Clear local voice detection interval if running
    if (window.localVoiceDetectionInterval) {
        clearInterval(window.localVoiceDetectionInterval);
        window.localVoiceDetectionInterval = null;
    }

    // 1. Leave Agora Channel
    if (client && UID !== null) { // Check if client is initialized AND user has joined an Agora channel
        console.log("Leaving Agora channel...");

        // Unpublish and close local tracks using properties
        if (localTracks.audioTrack && typeof localTracks.audioTrack.close === 'function') { // Check if track is an object and has close method
            if (micPublished) { // Only unpublish if it was actually published
                await client.unpublish([localTracks.audioTrack]);
            }
            localTracks.audioTrack.close(); // Close track to release resources
            localTracks.audioTrack = null; // Set to null for garbage collection/re-creation check
            micPublished = false;
        }
        if (localTracks.videoTrack && typeof localTracks.videoTrack.close === 'function') { // Check if track is an object and has close method
            await client.unpublish([localTracks.videoTrack]); // Unpublish
            localTracks.videoTrack.close(); // Close track to release resources
            localTracks.videoTrack = null; // Set to null
        }
        await client.leave();
        console.log("Agora client left the channel.");
        // Clear any UI elements for local stream
        document.getElementById('video-streams').innerHTML = ''; // Clear all video players
        UID = null; // Reset UID
    } else {
        location.reload();
    }

    if (!isErrorCleanup && socket && currentRoomId) { // Only emit if not an error cleanup and a room exists
        socket.emit('leave-room', { roomId: currentRoomId, username });
        console.log(`Socket.IO user ${username} explicitly left room ${currentRoomId}`);
        currentRoomId = null; // Clear current room ID on frontend
    } else if (isErrorCleanup) {
        console.log("Skipping Socket.IO leave due to error cleanup.");
        currentRoomId = null; // Clear current room ID anyway
    } else {
        console.log("Socket.IO not active or not in a room. Skipping Socket.IO leave.");
    }


    document.getElementById('messages').innerHTML = '';
    document.getElementById('chat-cont').style.display = 'none';
    // document.getElementById('video-container').style.display = 'none'; // Assuming video-container is part of stream-controls or video-streams
    document.getElementById('stream-controls').style.display = 'none';
    document.getElementById('container-chat-btn').style.display = 'none';
    document.getElementById('title').style.display = 'block'; // Show main title
    document.getElementById('logo-left').style.display = 'none'; // Hide left logo
    document.getElementById('head-buttons').style.display = 'flex'; // Show create/logout
    document.querySelector('.container-join-btn').style.display = 'flex'; // Show join buttons
    document.getElementById('side-chat').style.display = 'none'; // Hide chat sidebar
}

// === Chat Functions ===
function sendMessage(roomId, username, message) {
    socket.emit('send-message', { roomId, username, message });
}

function loadMessages(roomId) {
    fetch(`${API_BASE_URL}/messages?roomId=${roomId}`)
        .then(response => response.json())
        .then(messages => {
            const messagesContainer = document.getElementById("messages");
            messagesContainer.innerHTML = '';
            messages.forEach(msg => appendMessage(msg.username, msg.message));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        })
        .catch(err => console.error("Error loading messages:", err));
}

function appendMessage(sender, message) {
    const messagesContainer = document.getElementById("messages");
    const messageElement = document.createElement("div");
    messageElement.textContent = `${sender}: ${message}`;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function systemMessage(msg) {
    const messagesContainer = document.getElementById("messages");
    const messageElement = document("div");
    messageElement.classList.add("system-message");
    messageElement.textContent = msg;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}



// === Microphone and Camera Control ===
let toggleMic = async (e) => {
    const button = e.currentTarget;

    if (!localTracks.audioTrack || typeof localTracks.audioTrack.setMuted !== 'function') {
        console.warn("Audio track not fully initialized or not a valid track object. Cannot toggle mic.");
        alert("Microphone not ready. Please try again after joining the call.");
        return;
    }

    const micTrack = localTracks.audioTrack;

    if (micTrack.muted) {
        // Unmute the track
        await micTrack.setMuted(false);
        console.log("Mic unmuted");

        // If mic was not yet published to Agora, publish it now
        if (!micPublished) {
            try {
                await client.publish([micTrack]);
                micPublished = true;
                console.log("Mic published to the channel.");
            } catch (error) {
                console.error("Error publishing mic: ", error);
                alert("Failed to publish microphone. Check console.");

                await micTrack.setMuted(true);
                return;
            }
        }

        button.innerHTML = `
            <img src="public/assets/images/mic-on.png" alt="Mic On" class="mic-icon">
        `;
        button.style.backgroundColor = '#242424';
    } else {
        // Mute the track
        await micTrack.setMuted(true);
        console.log("Mic muted");

        // Unpublish from Agora when muted to save bandwidth (optional, but good practice)
        if (micPublished) {
            await client.unpublish([micTrack]);
            micPublished = false;
            console.log("Mic unpublished from the channel.");
        }

        button.innerHTML = `
            <img src="public/assets/images/mic-off.png" alt="Mic Off" class="mic-icon">
        ` ;
        button.style.backgroundColor = '#FF8578';
    }
};

let toggleCamera = async (e) => {
    const button = e.currentTarget;

    // More robust check: ensure track object exists and has the setMuted method
    if (!localTracks.videoTrack || typeof localTracks.videoTrack.setMuted !== 'function') {
        console.warn("Video track not fully initialized or not a valid track object. Cannot toggle camera.");
        alert("Camera not ready. Please try again after joining the call.");
        return;
    }

    const videoTrack = localTracks.videoTrack;

    if (videoTrack.muted) {
        await videoTrack.setMuted(false);
        isCameraOn = true;
        // If you ever unpublish video on mute, you'd publish it here.
        // For now, it's just muting/unmuting the video stream.
        button.innerHTML = `
            <img src="public/assets/images/camera-on.png" alt="Camera On" class="camera-icon">
        `;
        button.style.backgroundColor = '#A1FF99';
    } else {
        await videoTrack.setMuted(true);
        isCameraOn = false;
        button.innerHTML = `
            <img src="public/assets/images/camera-off.png" alt="Camera Off" class="camera-icon">
        `;
        button.style.backgroundColor = '#242424';
    }
};




// === Event Listeners ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const userData = await fetchUsername();
        username = userData.username;

        initializeUI();
        registerEventHandlers();
        checkActiveRooms(); // Initial check for rooms
        setInterval(checkActiveRooms, 5000); // Check every 5 seconds

        // Add event listeners for control buttons
        document.getElementById('leave-btn').addEventListener('click', leaveRoomAgoraAndSocket);
        document.getElementById('mic-btn').addEventListener('click', toggleMic);
        document.getElementById('camera-btn').addEventListener('click', toggleCamera);

        //load messages periodically (if chat is visible)
        setInterval(() => {
            if (currentRoomId && document.getElementById('side-chat').style.display === 'block') {
                loadMessages(currentRoomId);
            }
        }, 5000);

    } catch (error) {
        console.error("Initialization failed:", error);
        const messageBox = document.createElement('div');
        messageBox.textContent = "Failed to fetch user data. Please log in again.";
        messageBox.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;
            padding: 15px; border-radius: 5px; z-index: 1000;
        `;
        document.body.appendChild(messageBox);
        setTimeout(() => {
            messageBox.remove();
            window.location.href = "public/login-page.php";
        }, 3000);
    }
});
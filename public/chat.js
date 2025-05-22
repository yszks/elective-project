// This runs when the page loads
const roomId = 'myRoom123'; // You should dynamically get this based on the video room ID
const username = prompt('Enter your username'); // Or get from login/session

const socket = io('http://localhost:3000');

// Join the chat room
socket.emit('join-room', {
  roomId,
  username
});

// Load existing messages when joining
loadMessages();

// Function to send a message
function sendMessage(message) {
  fetch('http://localhost:3000/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, message }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Message sent:', data);
    loadMessages(); // Reload messages after sending
  })
  .catch(error => console.error('Error sending message:', error));
}

// Function to load messages
function loadMessages() {
  fetch('http://localhost:3000/messages')
    .then(res => res.json())
    .then(messages => {
      const messagesContainer = document.getElementById('messages');
      messagesContainer.innerHTML = ''; // Clear existing messages
      messages.forEach(msg => {
        const msgElement = document.createElement('div');
        msgElement.className = 'message';
        msgElement.innerHTML = `<strong>${msg.username}:</strong> ${msg.message}`;
        messagesContainer.appendChild(msgElement);
      });
    })
    .catch(error => console.error('Error loading messages:', error));
}

// Event listener for sending messages
document.getElementById('send-btn').addEventListener('click', () => {
  const msgInput = document.getElementById('chat-input');
  const message = msgInput.value.trim();
  if (message) {
    sendMessage(message);
    msgInput.value = ''; // Clear input after sending
  }
});

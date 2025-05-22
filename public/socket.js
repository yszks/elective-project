const roomUserMap = {}; // roomId => Set of socket IDs

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId;

    if (!roomUserMap[roomId]) {
      roomUserMap[roomId] = new Set();
    }
    roomUserMap[roomId].add(socket.id);
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    if (roomId && roomUserMap[roomId]) {
      roomUserMap[roomId].delete(socket.id);

      // If no one is left in the room, delete the room's messages
      if (roomUserMap[roomId].size === 0) {
        delete roomUserMap[roomId];
        db.run('DELETE FROM messages WHERE room_id = ?', [roomId], (err) => {
          if (err) console.error(`Failed to delete messages for room ${roomId}:`, err.message);
          else console.log(`All messages for room ${roomId} deleted.`);
        });
      }
    }
  });
});

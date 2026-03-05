export default function setupSockets(io) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Admin commands
        socket.on('startLevel1', () => io.emit('startLevel1'));
        socket.on('startGuessComponent', () => io.emit('startGuessComponent'));
        socket.on('startRiddles', () => io.emit('startRiddles'));
        socket.on('startQuiz', () => io.emit('startQuiz'));
        socket.on('showLeaderboard', () => io.emit('showLeaderboard'));
        socket.on('startLevel2', () => io.emit('startLevel2'));
        socket.on('showFinalResults', () => io.emit('showFinalResults'));

        // Additional generic event pass-through if needed
        socket.on('adminCommand', (data) => {
            io.emit(data.event, data.payload);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}

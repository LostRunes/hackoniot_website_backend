import { handleMenteeVote, syncMenteeState } from '../controllers/apiController.js';

export default function setupSockets(io) {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // Sync new connections with current state
        syncMenteeState(socket);

        // Admin commands
        socket.on('startLevel1', () => io.emit('startLevel1'));
        socket.on('startGuessComponent', () => io.emit('startGuessComponent'));
        socket.on('startRiddles', () => io.emit('startRiddles'));
        socket.on('startQuiz', () => io.emit('startQuiz'));
        socket.on('showLeaderboard', () => io.emit('showLeaderboard'));
        socket.on('startLevel2', () => io.emit('startLevel2'));
        socket.on('showFinalResults', () => io.emit('showFinalResults'));

        // Mentee Quiz Control Events (Alternative to HTTP)
        socket.on('startMenteeQuiz', () => {
            // These are handled by triggerAdminEvent but we can allow direct socket triggers too
            // For now socket.on('startMenteeQuiz') would trigger the same logic if needed
        });

        // Mentee Voting Events
        socket.on('voteSubmitted', (option) => {
            handleMenteeVote(io, option);
        });

        // Additional generic event pass-through if needed
        socket.on('adminCommand', (data) => {
            io.emit(data.event, data.payload);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}

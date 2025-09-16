const net = require('net');
const server = net.createServer();
const clients = new Map();
const HEARTBEAT_INTERVAL = 120000;
const HOST = '78.47.120.130';
const PORTS = [2121, 2122, 2123];

function broadcast(message, senderSocket = null) {
    clients.forEach((client, socket) => {
        if (socket !== senderSocket && !socket.destroyed) {
            try {
                socket.writeUTF(message + '0');
            } catch (e) {
                console.error(`Error broadcasting to client: ${e.message}`);
                socket.destroy();
                clients.delete(socket);
            }
        }
    });
}

function startHeartbeat() {
    setInterval(() => {
        clients.forEach((client, socket) => {
            if (!socket.destroyed) {
                try {
                    socket.writeUTF('');
                } catch (e) {
                    console.error(`Error sending heartbeat: ${e.message}`);
                    socket.destroy();
                    clients.delete(socket);
                }
            }
        });
    }, HEARTBEAT_INTERVAL);
}

PORTS.forEach(port => {
    const serverInstance = net.createServer(socket => {
        socket.setEncoding('utf8');
        clients.set(socket, { id: `client_${Date.now()}_${Math.random()}` });

        socket.on('data', data => {
            const message = data.toString().trim();
            if (message) {
                const [protocol, ...body] = message.split(':');
                const bodyStr = body.join('|');
                broadcast(`${protocol}:${bodyStr}`, socket);
            }
        });

        socket.on('end', () => {
            clients.delete(socket);
            broadcast('disconnected', socket);
        });

        socket.on('error', err => {
            console.error(`Socket error: ${err.message}`);
            clients.delete(socket);
            broadcast('disconnected', socket);
        });
    });

    serverInstance.listen(port, HOST, () => {
        console.log(`Server listening on port ${port}`);
    });

    serverInstance.on('error', err => {
        console.error(`Server error on port ${port}: ${err.message}`);
    });
});

startHeartbeat();
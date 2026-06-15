const http = require('http');
const app = require('./app');
const env = require('./config/env');
const setupSocketIO = require('./socket');

const server = http.createServer(app);

// Initialize Socket.io
setupSocketIO(server);

server.listen(env.PORT, () => {
  console.log(`Quiz Bee Server is running on port ${env.PORT}`);
});

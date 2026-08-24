const { createApp } = require('./app');
const { getDb } = require('./db');

const PORT = process.env.PORT || 3000;

async function start() {
  await getDb(); // Initialize DB schema
  const { server } = createApp();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ChatApp Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
});

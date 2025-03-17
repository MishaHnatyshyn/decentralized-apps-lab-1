import { GameClient } from './GameClient';

const client = new GameClient();

process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  client.close();
});

client.start().catch(console.error);

import * as grpc from '@grpc/grpc-js';
import { QuizGameService } from '../generated/quiz';
import { GameServer } from './GameServer';

async function startServer() {
  const server = new grpc.Server();
  const gameServer = new GameServer();

  server.addService(QuizGameService, gameServer.getServer());

  return new Promise<void>((resolve, reject) => {
    server.bindAsync(
      'localhost:50051',
      grpc.ServerCredentials.createInsecure(),
      (error, port) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`Server running on port ${port}`);
        resolve();
      }
    );
  });
}

startServer().catch(console.error);

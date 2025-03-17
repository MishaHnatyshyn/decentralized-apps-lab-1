import * as grpc from '@grpc/grpc-js';
import {GameState_State, QuizGameClient} from '../generated/quiz';
import { GameState, CreateRoomRequest, JoinRequest, AnswerRequest } from '../generated/quiz';
import * as readline from 'readline';
import { promisify } from 'util';

export class GameClient {
  private readonly client: QuizGameClient;
  private readonly rl: readline.Interface;
  private readonly question: (query: string) => Promise<string>;
  private username: string = '';

  constructor() {
    this.client = new QuizGameClient(
      'localhost:50051',
      grpc.credentials.createInsecure()
    );

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // @ts-ignore
    this.question = promisify(this.rl.question).bind(this.rl);
  }

  public async start(): Promise<void> {
    try {
      console.log('Welcome to Quiz Game!');
      console.log('1. Create a room');
      console.log('2. Join a room');

      const choice = await this.question('Enter your choice (1 or 2): ');
      this.username = await this.question('Enter your username: ');

      let stream;
      if (choice === '1') {
        stream = await this.createRoom();
      } else {
        const roomId = await this.question('Enter room ID: ');
        stream = await this.joinRoom(roomId);
      }

      this.handleGameStream(stream);
    } catch (error) {
      console.error('Error starting game:', error);
      this.close();
    }
  }

  private createRoom(): grpc.ClientReadableStream<GameState> {
    const request: CreateRoomRequest = {
      username: this.username
    };
    return this.client.createRoom(request);
  }

  private joinRoom(roomId: string): grpc.ClientReadableStream<GameState> {
    const request: JoinRequest = {
      username: this.username,
      roomId: roomId
    };
    return this.client.joinRoom(request);
  }

  private async submitAnswer(roomId: string, answer: number): Promise<void> {


    return new Promise((resolve, reject) => {
      const request: AnswerRequest = {
        username: this.username,
        roomId: roomId,
        answer: answer
      };

      this.client.submitAnswer(request, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  private handleGameStream(stream: grpc.ClientReadableStream<GameState>): void {
    stream.on('data', async (gameState: GameState) => {
      try {
        await this.handleGameState(gameState);
      } catch (error) {
        console.error('Error handling game state:', error);
      }
    });

    stream.on('error', (error) => {
      console.error('Connection closed:');
      this.close();
    });

    stream.on('end', () => {
      console.log('Game ended');
      this.close();
    });
  }

  private async handleGameState(gameState: GameState): Promise<void> {
    console.clear();
    console.log(`Room ID: ${gameState.roomId}`);
    console.log(`State: ${GameState_State[gameState.state]}`);
    console.log('Players:');
    gameState.players.forEach((player) => {
      console.log(`${player.username}: ${player.score} points`);
    });

    console.log('\nMessage:', gameState.message);

    if (gameState.currentQuestion && gameState.state === GameState_State.IN_PROGRESS) {
      console.log('\nQuestion:', gameState.currentQuestion.text);
      gameState.currentQuestion.options.forEach((option, index) => {
        console.log(`${index}. ${option}`);
      });

      while (true) {
        const answer = await this.question('Your answer (0-3): ');
        const parsedAnswer = parseInt(answer);

        if (parsedAnswer < 0 || parsedAnswer > 3 || isNaN(parsedAnswer)) {
          console.log('Invalid answer. Please enter a number between 0 and 3');
          continue;
        }

        await this.submitAnswer(gameState.roomId, parseInt(answer));
        break;
      }
    } else if (gameState.state === GameState_State.WAITING) {
      console.log('\nWaiting for more players to join...');
    }
  }

  public close(): void {
    this.rl.close();
    process.exit(0);
  }
}

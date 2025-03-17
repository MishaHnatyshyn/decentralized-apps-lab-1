import * as grpc from '@grpc/grpc-js';
import { Question } from './Question';
import {GameState, GameState_State} from '../generated/quiz';

export class Room {
  private readonly id: string;
  private readonly players: Map<string, grpc.ServerWritableStream<any, any>>;
  private readonly scores: Map<string, number>;
  private readonly answers: Map<string, number>;
  private currentQuestion: number;
  private state: GameState_State;

  constructor(roomId: string) {
    this.id = roomId;
    this.players = new Map();
    this.scores = new Map();
    this.answers = new Map();
    this.currentQuestion = 0;
    this.state = GameState_State.WAITING;
  }

  public addPlayer(username: string, stream: grpc.ServerWritableStream<any, any>): void {
    this.players.set(username, stream);
    this.scores.set(username, 0);
  }

  public removePlayer(username: string): void {
    this.players.delete(username);
    this.scores.delete(username);
  }

  public async submitAnswer(username: string, answer: number): Promise<void> {
    this.answers.set(username, answer);

    if (this.answers.size === 2) {
      await this.processAnswers();
      this.answers.clear();

      if (this.currentQuestion === 4) {
        await this.end();
      } else {
        this.currentQuestion++;
        await this.broadcastState();
      }
    }
  }

  public async start(): Promise<void> {
    this.state = GameState_State.IN_PROGRESS;
    await this.broadcastState();
  }

  public async end(): Promise<void> {
    this.state = GameState_State.FINISHED;
    await this.broadcastState();

    const endPromises = Array.from(this.players.values()).map(stream => {
      return new Promise<void>((resolve) => {
        stream.end(() => resolve());
      });
    });

    await Promise.all(endPromises);
  }

  public isFull(): boolean {
    return this.players.size >= 2;
  }

  public async broadcastState(): Promise<void> {
    const state = this.getGameState();

    const writePromises = Array.from(this.players.values()).map(stream => {
      return new Promise<void>((resolve, reject) => {
        stream.write(state, (error: any) => {
          if (error) reject(error);
          else resolve();
        });
      });
    });

    await Promise.all(writePromises);
  }

  private async processAnswers(): Promise<void> {
    const question = Question.getQuestions()[this.currentQuestion];

    for (const [username, answer] of this.answers.entries()) {
      if (answer === question.correctOption) {
        const currentScore = this.scores.get(username) || 0;
        this.scores.set(username, currentScore + 1);
      }
    }
  }

  private getGameState(): GameState {
    return {
      state: this.state,
      roomId: this.id,
      players: Array.from(this.scores.entries()).map(([username, score]) => ({
        username,
        score
      })),
      currentQuestion: this.currentQuestion < 5 ? Question.getQuestions()[this.currentQuestion] : undefined,
      questionNumber: this.currentQuestion + 1,
      message: this.getStateMessage()
    };
  }

  private getStateMessage(): string {
    switch (this.state) {
      case GameState_State.WAITING:
        return 'Waiting for another player to join...';
      case GameState_State.IN_PROGRESS:
        return `Question ${this.currentQuestion + 1} of 5`;
      case GameState_State.FINISHED:
        const scores = Array.from(this.scores.entries());
        const winner = scores.reduce((a, b) => (a[1] > b[1] ? a : b));
        return `Game Over! Winner: ${winner[0]} with ${winner[1]} points`;
      default:
        return '';
    }
  }

  public getId(): string {
    return this.id;
  }
}

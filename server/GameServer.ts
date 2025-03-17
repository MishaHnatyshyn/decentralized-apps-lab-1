import * as grpc from '@grpc/grpc-js';
import { QuizGameServer } from '../generated/quiz';
import { Room } from './Room';

export class GameServer {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  public getServer(): QuizGameServer {
    return {
      createRoom: this.createRoom.bind(this),
      joinRoom: this.joinRoom.bind(this),
      submitAnswer: this.submitAnswer.bind(this)
    };
  }

  private async createRoom(call: grpc.ServerWritableStream<any, any>): Promise<void> {
    try {
      const roomId = Math.random().toString(36).substring(7);
      const username = call.request.username;

      const room = new Room(roomId);
      room.addPlayer(username, call);
      this.rooms.set(roomId, room);

      await room.broadcastState();

      call.on('cancelled', async () => {
        await this.handlePlayerDisconnect(room, username);
      });
    } catch (error) {
      console.error('Error in createRoom:', error);
      call.emit('error', error);
    }
  }

  private async joinRoom(call: grpc.ServerWritableStream<any, any>): Promise<void> {
    try {
      const { roomId, username } = call.request;
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.isFull()) {
        throw new Error('Room is full');
      }

      room.addPlayer(username, call);

      call.on('cancelled', async () => {
        await this.handlePlayerDisconnect(room, username);
      });

      if (room.isFull()) {
        await room.start();
      }

      await room.broadcastState();
    } catch (error) {
      console.error('Error in joinRoom:', error);
      call.emit('error', error);
    }
  }

  private async submitAnswer(call: any, callback: any): Promise<void> {
    try {
      const { roomId, username, answer } = call.request;
      const room = this.rooms.get(roomId);

      if (!room) {
        throw new Error('Room not found');
      }

      await room.submitAnswer(username, answer);
      callback(null, {});
    } catch (error) {
      console.error('Error in submitAnswer:', error);
      callback(error, null);
    }
  }

  private async handlePlayerDisconnect(room: Room, username: string): Promise<void> {
    room.removePlayer(username);
    await room.end();
    this.rooms.delete(room.getId());
  }
}

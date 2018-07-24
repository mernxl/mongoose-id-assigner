import { Document, Model, Schema } from 'mongoose';
import { MongooseIdAssigner } from './MongooseIdAssigner';

export interface SchemaState {
  modelName: string;
  readyState: number;
  model?: Model<Document>;
  error?: Error;
  idAssigner: MongooseIdAssigner;
}

export class LocalStateStore {
  private static _instance: LocalStateStore;

  /* Collection Used for Storing ids */
  private collName: string;

  private stateMap: Map<Schema, SchemaState>;

  constructor() {
    this.collName = 'id_assigner';
    this.stateMap = new Map<Schema, SchemaState>();

    LocalStateStore._instance = this;
  }

  getState(schema: Schema) {
    return this.stateMap.get(schema);
  }

  setState(schema: Schema, state: SchemaState) {
    const preState = this.stateMap.get(schema);
    if (!preState) {
      this.stateMap.set(schema, state);
      state.idAssigner.emit('unready');
    } else {
      this.stateMap.set(schema, state);
      if (state.readyState !== preState.readyState) {
        if (state.readyState === 2) {
          state.idAssigner.emit('init');
        }
        if (state.readyState === 1) {
          state.idAssigner.emit('ready');
        }
        if (state.readyState === 0) {
          state.idAssigner.emit('unready');
        }
        if (state.readyState === -1) {
          state.idAssigner.emit('error');
        }
      }
    }
  }

  clear() {
    this.stateMap.clear();
  }

  getCollName(): string {
    return this.collName;
  }

  setCollName(collName: string) {
    this.collName = collName;
  }
}

export const localStateStore: LocalStateStore = new LocalStateStore();

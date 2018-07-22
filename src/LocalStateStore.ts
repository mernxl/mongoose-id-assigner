import { Document, Model, Schema } from 'mongoose';
import { MongooseIdAssigner } from './MongooseIdAssigner';

export interface SchemaState {
  modelName: string;
  isReady: number; // 0 - notReady, 1 ready, 2 initialising
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
    this.collName = 'm_assign_id';
    this.stateMap = new Map<Schema, SchemaState>();

    LocalStateStore._instance = this;
  }

  static getStore() {
    return this._instance || new LocalStateStore();
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
      if (state.isReady !== preState.isReady) {
        if (state.isReady === 2) {
          state.idAssigner.emit('init');
        }
        if (state.isReady === 1) {
          state.idAssigner.emit('ready');
        }
        if (state.isReady === 0) {
          state.idAssigner.emit('unready');
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

import { Document, Model, Schema } from 'mongoose';
import { MongooseIdAssigner } from './MongooseIdAssigner';
import { throwPluginError } from './utils';

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

  /**
   * Get the Collection name for all idAssigners
   * @return {string}
   */
  getCollName(): string {
    return this.collName;
  }

  /**
   * Can only be called on at app bootstrap, that is before any IA initialises
   * Well the functionality comes as setting a different collName will make ids
   * inconsistent for mongoose connection instances
   * @param {string} collName
   */
  setCollName(collName: string) {
    for (const config of this.stateMap.values()) {
      if (config.readyState === 1 || config.readyState === 2) {
        throwPluginError(
          'Could not Set CollName as Some Assigners have initialised, Call setCollName at app bootstrap level.',
        );
      }
    }
    this.collName = collName;
  }
}

export const localStateStore: LocalStateStore = new LocalStateStore();

import * as eventToPromise from 'event-to-promise';
import { EventEmitter } from 'events';
import { Collection } from 'mongodb';
import { Document, Model, Schema } from 'mongoose';
import { AssignIdPluginOptions, IdOptions } from './assigner.interfaces';
import { localStateStore, SchemaState } from './LocalStateStore';
import { initialiseOptions, normaliseOptions, throwPluginError, waitPromise } from './utils';
import { refreshOptions } from './utils/assign-fields-ids';
import { configureSchema } from './utils/configure-schema';

export interface NormalisedOptions {
  modelName: string;
  network: boolean;
  fields?: Map<string, IdOptions>;
}

export class MongooseIdAssigner extends EventEmitter {
  public readonly schema: Schema;

  public readonly retryMillis: number;
  public readonly retryTime: number;
  public readonly modelName: string;
  public readonly options: NormalisedOptions;

  constructor(schema: Schema, options: AssignIdPluginOptions) {
    super();
    if (!schema) {
      throwPluginError('Provide a schema for the plugin!');
    }

    if (localStateStore.getState(schema)) {
      throwPluginError('Provided schema already have an Assigner Instance!');
    }

    this.schema = schema;
    this.retryTime = 20;
    this.retryMillis = 20; // after 20 millis
    this.options = normaliseOptions(options);
    this.modelName = this.options.modelName;
    this._modelNameIndex();
    configureSchema(this);
  }

  get isReady() {
    return this.state.isReady;
  }

  get state(): SchemaState {
    const state = localStateStore.getState(this.schema);
    if (!state) {
      localStateStore.setState(this.schema, {
        modelName: this.modelName,
        isReady: 0,
        idAssigner: this,
      });
    } else {
      return state;
    }
    return localStateStore.getState(this.schema) as any;
  }

  get collection(): Collection<AssignIdPluginOptions> {
    const { model, error } = this.state;
    if (!model) {
      if (error) {
        throwPluginError('Cannot read Model, Error At Initialisation');
      } else {
        throwPluginError('Cannot read Model, Not Initialised');
      }
    }
    return (model as Model<Document>).db.collection(localStateStore.getCollName());
  }

  static plugin(schema: Schema, options: AssignIdPluginOptions) {
    return new MongooseIdAssigner(schema, options);
  }

  refreshOptions() {
    return refreshOptions(this);
  }

  appendState(state: Partial<SchemaState>) {
    localStateStore.setState(this.schema, { ...this.state, ...state });
  }

  initialise(modelInstance: Model<Document>): Promise<number> {
    if (this.state.isReady === 0) {
      this.appendState({ isReady: 2 });

      return initialiseOptions(modelInstance, this);
    }

    return this.state.isReady === 1
      ? Promise.resolve(1)
      : eventToPromise(this, 'ready').then(() => 1);
  }

  private _modelNameIndex() {
    this.on('ready', async () => {
      if (!this.options.fields) {
        return;
      }

      try {
        await waitPromise(1); // nextTick

        await this.collection.createIndex('modelName');
      } catch (e) {
        throw e;
      }
    });
  }
}

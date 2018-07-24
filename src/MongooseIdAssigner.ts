import * as eventToPromise from 'event-to-promise';
import { EventEmitter } from 'events';
import { Collection } from 'mongodb';
import { Document, Model, Schema } from 'mongoose';
import { AssignerOptions, FieldConfig } from './assigner.interfaces';
import { localStateStore, SchemaState } from './LocalStateStore';
import {
  initialiseOptions,
  normaliseOptions,
  throwPluginError,
  waitPromise,
} from './utils';
import { refreshOptions } from './utils/assign-fields-ids';
import { configureSchema } from './utils/configure-schema';

export interface NormalisedOptions {
  modelName: string;
  network: boolean;
  fields?: Map<string, FieldConfig>;
}

/**
 * The numbers also depict what you receive upon from readyState
 * @event 1. ready - If the init process is complete
 * @event 2. init - Initialising the idAssigner
 * @event 0. unready - Init process not started
 * @event -1. error - Init process error out
 */
export class MongooseIdAssigner extends EventEmitter {
  public readonly schema: Schema;

  public readonly retryMillis: number;
  public readonly retryTime: number;
  public readonly modelName: string;
  public readonly options: NormalisedOptions;

  constructor(schema: Schema, options: AssignerOptions) {
    super();
    if (!schema) {
      throwPluginError('Provide a schema for the plugin!');
    }

    if (localStateStore.getState(schema)) {
      throwPluginError(
        'Provided schema already have an Assigner Instance!',
        options.modelName,
      );
    }

    this.schema = schema;
    this.retryTime = 20;
    this.retryMillis = 20; // after 20 millis
    this.options = normaliseOptions(options);
    this.modelName = this.options.modelName;
    this._saveState();
    this._modelNameIndex();
    configureSchema(this);
  }

  get readyState() {
    return this.state.readyState;
  }

  get state(): SchemaState {
    return localStateStore.getState(this.schema) as any;
  }

  get collection(): Collection<AssignerOptions> {
    const { model, error } = this.state;
    if (!model) {
      if (error) {
        throwPluginError('Cannot read Model, Error At Initialisation');
      } else {
        throwPluginError('Cannot read Model, Not Initialised');
      }
    }
    return (model as Model<Document>).db.collection(
      localStateStore.getCollName(),
    );
  }

  static plugin(schema: Schema, options: AssignerOptions) {
    return new MongooseIdAssigner(schema, options);
  }

  refreshOptions() {
    return refreshOptions(this);
  }

  appendState(state: Partial<SchemaState>) {
    localStateStore.setState(this.schema, { ...this.state, ...state });
  }

  initialise(modelInstance: Model<Document>): Promise<number> {
    if (this.state.readyState === 0) {
      this.appendState({ readyState: 2 });

      return initialiseOptions(modelInstance, this);
    }

    return this.state.readyState === 1
      ? Promise.resolve(1)
      : eventToPromise(this, 'ready').then(() => 1);
  }

  private _saveState() {
    localStateStore.setState(this.schema, {
      modelName: this.modelName,
      readyState: 0,
      idAssigner: this,
    });
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

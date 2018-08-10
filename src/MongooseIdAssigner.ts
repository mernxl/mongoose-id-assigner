import * as eventToPromise from 'event-to-promise';
import { EventEmitter } from 'events';
import { Binary, Collection, ObjectId } from 'mongodb';
import { Document, Model, Schema } from 'mongoose';
import {
  AssignerOptions,
  AssignerPluginOptions,
  FieldConfig,
  FieldConfigTypes,
  NumberFieldConfig,
} from './assigner.interfaces';
import { localStateStore, SchemaState } from './LocalStateStore';
import { initialiseOptions, normaliseOptions, throwPluginError } from './utils';
import { refreshOptions } from './utils/assign-fields-ids';
import { configureSchema } from './utils/configure-schema';
import {
  getNextIdNumber,
  getNextIdString,
  getNextIdUUID,
} from './utils/get-next-ids';

/**
 * Options stored in db, plus modelName
 */
export interface NormalisedOptions {
  modelName: string;
  network: boolean;
  timestamp?: number | null;
  fields?: Map<string, FieldConfig>;
  discriminators?: Map<string, Map<string, FieldConfig>>;
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
  public readonly modelName: string;
  public readonly discriminatorKey: string;

  public readonly retryTime: number;
  public readonly retryMillis: number;
  public readonly options: NormalisedOptions;

  private readonly asPlugin: boolean;

  constructor(model: Model<any>, options?: AssignerOptions, asPlugin = false) {
    super();
    if (!asPlugin && (!model || !model.schema || !model.modelName)) {
      throwPluginError(
        `Provide a Model to the Constructor, you provided ${model}!`,
      );
    }
    let schema: Schema;
    let modelName: string;

    if (asPlugin) {
      modelName = (options as AssignerPluginOptions).modelName;
      schema = model as any;
    } else {
      modelName = model.modelName;
      schema = model.schema;
    }

    if (localStateStore.getState(schema)) {
      throwPluginError(
        'Provided Model already has an Assigner Instance!',
        modelName,
      );
    }

    this.schema = schema;
    this.asPlugin = asPlugin;
    this.modelName = modelName;
    this.discriminatorKey = schema.get('discriminatorKey');

    this.retryTime = 20;
    this.retryMillis = 20; // after 20 millis
    this.options = normaliseOptions(modelName, schema, options);

    this.appendState({
      modelName: this.modelName,
      readyState: 0,
      idAssigner: this,
    });
    configureSchema(this);
    if (!asPlugin) {
      this.appendState({ model });
      this.initialise().then();
    }
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
        throwPluginError('Cannot read Model, Error At Initialisation' + error);
      } else {
        throwPluginError('Cannot read Model, Not Initialised');
      }
    }
    return (model as Model<Document>).db.collection(
      localStateStore.getCollName(),
    );
  }

  static plugin(schema: Schema, options: AssignerPluginOptions) {
    if (!schema) {
      throwPluginError('Should be called using schema.plugin');
    }
    if (!options) {
      throw throwPluginError('Plugin Options not specified!');
    }
    const IA = new MongooseIdAssigner(schema as any, options, true);
    return !!IA;
  }

  refreshOptions(): Promise<void> {
    return refreshOptions(this);
  }

  getFieldConfig(
    field: string,
    discriminator?: string,
  ): FieldConfig | undefined {
    if (discriminator && this.options.discriminators) {
      for (const [key, value] of this.options.discriminators.entries()) {
        if (key === discriminator) {
          for (const [k, v] of value.entries()) {
            if (k === field) {
              return v;
            }
          }
        }
      }
    }
    if (this.options.fields) {
      for (const [k, v] of this.options.fields.entries()) {
        if (k === field) {
          return v;
        }
      }
    }
    return;
  }

  async getNextId(
    field: string,
    discriminator?: string,
  ): Promise<
    | void
    | ObjectId
    | Binary
    | string
    | number
    | Promise<number>
    | Promise<string>
  > {
    const fieldConfig = this.getFieldConfig(field, discriminator);

    if (!fieldConfig) {
      return throwPluginError(
        `Requested Field, [${field}] does not have a Field Configuration!`,
        this.modelName,
      );
    }

    switch (fieldConfig.type) {
      case FieldConfigTypes.ObjectId:
        return new ObjectId();
      case FieldConfigTypes.UUID:
        return getNextIdUUID(fieldConfig);

      case FieldConfigTypes.Number:
        await this.refreshOptions();
        return getNextIdNumber(
          field,
          this,
          fieldConfig as NumberFieldConfig,
          '',
          0,
          true,
        );
      case FieldConfigTypes.String:
        await this.refreshOptions();
        return getNextIdString(field, this, fieldConfig, '', 0, true);
    }
  }

  appendState(state: Partial<SchemaState>) {
    localStateStore.setState(this.schema, { ...this.state, ...state });
  }

  initialise(modelInstance?: Model<Document>): Promise<number> {
    if (this.state.readyState === 0) {
      this.appendState({ readyState: 2 });

      if (!this.asPlugin) {
        modelInstance = this.state.model;
      }

      return initialiseOptions(modelInstance as any, this);
    }

    return this.state.readyState === 1
      ? Promise.resolve(1)
      : eventToPromise(this, 'ready').then(() => 1);
  }
}

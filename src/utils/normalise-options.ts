import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
  StringFieldConfig,
} from '../assigner.interfaces';
import { NormalisedOptions } from '../MongooseIdAssigner';
import { throwPluginError } from './others';
import { isNumber, isObjectId, isString, isUUID } from './type-guards';

function checkFieldConfig(
  modelName: string,
  field: string,
  config: FieldConfig,
): boolean {
  if (isObjectId(config)) {
    return false;
  }

  if (isUUID(config)) {
    if (!config.version) {
      config.version = 1;
    }
    config.asBinary = !!config.asBinary;

    if (!(config.version === 4 || config.version === 1)) {
      throwPluginError(`UUID version must be either 1 or 4!`, modelName, field);
    }
    return false;
  }

  if (
    !(config as any).nextId ||
    typeof (config as any).nextId !== config.type.toLowerCase()
  ) {
    throwPluginError(
      'nextId is required, should have as type ' + config.type,
      modelName,
      field,
    );
  }

  if (
    (config as StringFieldConfig).nextIdFunction &&
    typeof (config as StringFieldConfig).nextIdFunction !== 'function'
  ) {
    throwPluginError('nextIdFunction must be a `Function`!', modelName, field);
  }

  if (isNumber(config) && config.nextIdFunction) {
    if (config.incrementBy && typeof config.incrementBy !== 'number') {
      throwPluginError(
        'incrementBy must be of type `number`!',
        modelName,
        field,
      );
    }
    if (
      typeof config.nextIdFunction(config.nextId, config.incrementBy) !==
      'number'
    ) {
      throwPluginError(
        'nextIdFunction must return nextId of type `number`!',
        modelName,
        field,
      );
    }
    return true;
  }

  if (isString(config) && config.nextIdFunction) {
    if (typeof config.nextIdFunction(config.nextId) !== 'string') {
      throwPluginError(
        'nextIdFunction must return nextId of type `string`!',
        modelName,
        field,
      );
    }
    return true;
  }

  return true;
}

export function normaliseOptions(
  options: AssignerOptions,
  discriminator = false,
): NormalisedOptions {
  if (!options) {
    throw throwPluginError('Plugin Options not specified!');
  }

  if (!options.modelName) {
    throw throwPluginError('Plugin `modelName` must be defined!');
  }

  if (!options.fields) {
    return { modelName: options.modelName, network: false };
  }

  const normalised: NormalisedOptions = {
    modelName: options.modelName,
    network: false,
  };

  const fields: Map<string, FieldConfig> = new Map();

  if (!options.fields['_id']) {
    options.fields['_id'] = { type: 'ObjectId' };
  }

  for (const field in options.fields) {
    if (!options.fields.hasOwnProperty(field)) {
      continue;
    }

    let fieldConfig = options.fields[field];

    if (typeof fieldConfig === 'boolean') {
      fieldConfig = { type: FieldConfigTypes.ObjectId };
    }

    if (typeof fieldConfig === 'number') {
      normalised.network = true;
      fieldConfig = { type: FieldConfigTypes.Number, nextId: fieldConfig };
    }

    if (typeof fieldConfig === 'string') {
      if (
        fieldConfig === FieldConfigTypes.UUID ||
        fieldConfig === FieldConfigTypes.GUID
      ) {
        fieldConfig = { type: FieldConfigTypes.UUID, version: 1 };
      } else if (fieldConfig === FieldConfigTypes.ObjectId) {
        fieldConfig = { type: FieldConfigTypes.ObjectId };
      } else {
        normalised.network = true;
        fieldConfig = { type: FieldConfigTypes.String, nextId: fieldConfig };
      }
    }

    if (
      // if not converted to Object already
      (fieldConfig && typeof fieldConfig !== 'object') ||
      !FieldConfigTypes[fieldConfig.type]
    ) {
      throwPluginError(
        `Unknown Field Type for field [${field}]`,
        options.modelName,
      );
    }

    if (fieldConfig && typeof fieldConfig === 'object') {
      const network = checkFieldConfig(options.modelName, field, fieldConfig);
      if (network) {
        normalised.network = true;
      }
    }

    fields.set(field, fieldConfig);
  }

  normalised.fields = fields;

  /*if (isDiscriminator(options)) {
   for (const discriminator in options.discriminators) {
   if (options.discriminators.hasOwnProperty(discriminator)) {
   const dis = options.discriminators[ discriminator ];
   }
   }
   }*/
  return normalised;
}

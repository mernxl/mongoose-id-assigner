import {
  AssignerFieldsConfigMap,
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
  StringFieldConfig,
} from '../assigner.interfaces';
import { NormalisedOptions } from '../MongooseIdAssigner';
import { PluginError } from './others';
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
      throw PluginError(
        `UUID version must be either 1 or 4!`,
        modelName,
        field,
      );
    }
    return false;
  }

  if (
    !(config as any).nextId ||
    typeof (config as any).nextId !== config.type.toLowerCase()
  ) {
    throw PluginError(
      'nextId is required, should have as type ' + config.type,
      modelName,
      field,
    );
  }

  if (
    (config as StringFieldConfig).nextIdFunction &&
    typeof (config as StringFieldConfig).nextIdFunction !== 'function'
  ) {
    throw PluginError('nextIdFunction must be a `Function`!', modelName, field);
  }

  if (isNumber(config)) {
    if (config.incrementBy) {
      throw PluginError(
        'incrementBy must be of type `number`!',
        modelName,
        field,
      );
    }
    if (
      config.nextIdFunction &&
      typeof config.nextIdFunction(config.nextId, config.incrementBy) !==
        'number'
    ) {
      throw PluginError(
        'nextIdFunction must return nextId of type `number`!',
        modelName,
        field,
      );
    }
    return true;
  }

  if (isString(config) && config.nextIdFunction) {
    if (typeof config.nextIdFunction(config.nextId) !== 'string') {
      throw PluginError(
        'nextIdFunction must return nextId of type `string`!',
        modelName,
        field,
      );
    }
    return true;
  }

  return true;
}

function normaliseFieldsConfigMap(
  modelName: string,
  fieldsConfigMap?: AssignerFieldsConfigMap,
): {
  network: boolean;
  fields: Map<string, FieldConfig> | undefined;
} {
  if (!fieldsConfigMap) {
    return { network: false, fields: undefined };
  }

  const rObject = {
    network: false,
    fields: new Map<string, FieldConfig>(),
  };

  const fields: Map<string, FieldConfig> = rObject.fields;

  for (const field in fieldsConfigMap) {
    if (!fieldsConfigMap.hasOwnProperty(field)) {
      continue;
    }

    let fieldConfig = fieldsConfigMap[field];

    if (typeof fieldConfig === 'boolean') {
      fieldConfig = { type: FieldConfigTypes.ObjectId };
    }

    if (typeof fieldConfig === 'number') {
      rObject.network = true;
      fieldConfig = { type: FieldConfigTypes.Number, nextId: fieldConfig };
    }

    if (typeof fieldConfig === 'string') {
      if ((FieldConfigTypes as any)[fieldConfig]) {
        switch (fieldConfig) {
          case FieldConfigTypes.ObjectId:
            fieldConfig = { type: FieldConfigTypes.ObjectId };
            break;
          case FieldConfigTypes.UUID:
          case FieldConfigTypes.GUID:
            fieldConfig = { type: FieldConfigTypes.UUID, version: 1 };
            break;

          default:
            // Number and String
            throw PluginError(
              `nextId not provided for field type ${fieldConfig}!`,
              modelName,
              field,
            );
        }
      } else {
        rObject.network = true;
        fieldConfig = { type: FieldConfigTypes.String, nextId: fieldConfig };
      }
    }

    if (
      // if not converted to Object already
      typeof fieldConfig === 'string' ||
      (fieldConfig && typeof fieldConfig !== 'object') ||
      !FieldConfigTypes[fieldConfig.type]
    ) {
      throw PluginError(
        `Unknown FieldConfigType ${fieldConfig}`,
        modelName,
        field,
      );
    }

    if (fieldConfig && typeof fieldConfig === 'object') {
      const network = checkFieldConfig(modelName, field, fieldConfig);
      if (network) {
        rObject.network = true;
      }

      fields.set(field, fieldConfig);
    }
  }

  return rObject;
}

export function normaliseOptions(
  modelName: string,
  options?: AssignerOptions,
): NormalisedOptions {
  if (!modelName) {
    throw PluginError('Plugin `modelName` must be defined!');
  }

  const normalised: NormalisedOptions = {
    modelName,
    ...normaliseFieldsConfigMap(
      modelName,
      options ? options.fields : undefined,
    ),
  };

  normalised.fields = normalised.fields
    ? normalised.fields
    : new Map<string, FieldConfig>();

  // set default _id field
  if (!normalised.fields.has('_id')) {
    normalised.fields.set('_id', { type: FieldConfigTypes.ObjectId });
  }

  // cannot rely on discriminatorKey as its default __t
  if (options && options.discriminators) {
    const discriminatorMap: Map<string, Map<string, FieldConfig>> = new Map();
    for (const dName in options.discriminators) {
      if (!options.discriminators.hasOwnProperty(dName)) {
        continue;
      }

      const discriminator: AssignerFieldsConfigMap =
        options.discriminators[dName];
      const rObjectDNormalisedFields = normaliseFieldsConfigMap(
        dName,
        discriminator,
      );

      if (!rObjectDNormalisedFields.fields) {
        continue;
      }

      if (rObjectDNormalisedFields.network) {
        normalised.network = true;
      }

      discriminatorMap.set(dName, rObjectDNormalisedFields.fields);
    }

    if (discriminatorMap.size > 0) {
      normalised.discriminators = discriminatorMap;
    }
  }

  return normalised;
}

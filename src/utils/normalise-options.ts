import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
  StringFieldConfig,
} from '../assigner.interfaces';
import { NormalisedOptions } from '../MongooseIdAssigner';
import { throwPluginError } from './others';
import { isNumber, isObjectId, isString, isUUID } from './type-guards';

function checkIdOptions(
  modelName: string,
  field: string,
  options: FieldConfig,
): boolean {
  if (isObjectId(options)) {
    return false;
  }

  if (isUUID(options)) {
    if (!options.version) {
      options.version = 1;
      options.asBinary = !!options.asBinary;
    }

    if (!(options.version === 4 || options.version === 1)) {
      throwPluginError(`UUID version must be either 1 or 4!`, modelName, field);
    }
    return false;
  }

  if (
    !(options as any).nextId ||
    typeof (options as any).nextId !== options.type.toLowerCase()
  ) {
    throwPluginError(
      'nextId is required, should have as type ' + options.type,
      modelName,
      field,
    );
  }

  if (
    (options as StringFieldConfig).incFn &&
    typeof (options as StringFieldConfig).incFn !== 'function'
  ) {
    throwPluginError('incFn must be a `Function`!', modelName, field);
  }

  if (isNumber(options) && options.incFn) {
    if (options.incrementBy && typeof options.incrementBy !== 'number') {
      throwPluginError(
        'incrementBy must be of type `number`!',
        modelName,
        field,
      );
    }
    if (
      typeof options.incFn(options.nextId, options.incrementBy) !== 'number'
    ) {
      throwPluginError(
        'incFn must return nextId of type `number`!',
        modelName,
        field,
      );
    }
    return true;
  }

  if (isString(options) && options.incFn) {
    if (typeof options.incFn(options.nextId) !== 'string') {
      throwPluginError(
        'incFn must return nextId of type `string`!',
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
    throw new Error('[MongooseIdAssigner] Plugin Options not specified!');
  }

  if (!options.modelName) {
    throw new Error(
      '[MongooseIdAssigner] Plugin Option `modelName` must be defined',
    );
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

    let fieldOptions = options.fields[field];

    if (typeof fieldOptions === 'boolean') {
      fieldOptions = { type: FieldConfigTypes.ObjectId };
    }

    if (typeof fieldOptions === 'number') {
      normalised.network = true;
      fieldOptions = { type: FieldConfigTypes.Number, nextId: fieldOptions };
    }

    if (typeof fieldOptions === 'string') {
      if (
        fieldOptions === FieldConfigTypes.UUID ||
        fieldOptions === FieldConfigTypes.GUID
      ) {
        fieldOptions = { type: FieldConfigTypes.UUID, version: 4 };
      } else if (fieldOptions === FieldConfigTypes.ObjectId) {
        fieldOptions = { type: FieldConfigTypes.ObjectId };
      } else {
        normalised.network = true;
        fieldOptions = { type: FieldConfigTypes.String, nextId: fieldOptions };
      }
    }

    if (
      // if not converted to Object already
      (fieldOptions && typeof fieldOptions !== 'object') ||
      !FieldConfigTypes[fieldOptions.type]
    ) {
      throwPluginError(
        `Unknown Field Type for field [${field}]`,
        options.modelName,
      );
    }

    if (fieldOptions && typeof fieldOptions === 'object') {
      const network = checkIdOptions(options.modelName, field, fieldOptions);
      if (network) {
        normalised.network = true;
      }
    }

    fields.set(field, fieldOptions);
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

import {
  AssignIdPluginOptions,
  FieldTypes,
  IdOptions,
  StringOptions,
} from '../assigner.interfaces';
import { NormalisedOptions } from '../MongooseIdAssigner';
import { throwPluginError } from './others';
import { isNumber, isObjectId, isString, isUUID } from './type-guards';

function checkIdOptions(
  modelName: string,
  field: string,
  options: IdOptions,
): boolean {
  if (isObjectId(options)) {
    return false;
  }

  if (isUUID(options)) {
    if (!options.version || !(options.version === 4 || options.version === 1)) {
      throwPluginError(
        `UUID version is required and must be either 4 or 1!`,
        modelName,
        field,
      );
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
    (options as StringOptions).incFn &&
    typeof (options as StringOptions).incFn !== 'function'
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
  options: AssignIdPluginOptions,
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

  const fields: Map<string, IdOptions> = new Map();

  if (!options.fields['_id']) {
    options.fields['_id'] = { type: 'ObjectId' };
  }

  for (const field in options.fields) {
    if (!options.fields.hasOwnProperty(field)) {
      continue;
    }

    let fieldOptions = options.fields[field];

    if (typeof fieldOptions === 'boolean') {
      fieldOptions = { type: FieldTypes.ObjectId };
    }

    if (typeof fieldOptions === 'number') {
      normalised.network = true;
      fieldOptions = { type: FieldTypes.Number, nextId: fieldOptions };
    }

    if (typeof fieldOptions === 'string') {
      if (
        fieldOptions === FieldTypes.UUID ||
        fieldOptions === FieldTypes.GUID
      ) {
        fieldOptions = { type: FieldTypes.UUID, version: 4 };
      } else {
        normalised.network = true;
        fieldOptions = { type: FieldTypes.String, nextId: fieldOptions };
      }
    }

    if (
      // if not converted to Object already
      (fieldOptions && typeof fieldOptions !== 'object') ||
      !FieldTypes[fieldOptions.type]
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

import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { FieldConfig } from '../assigner.interfaces';
import { MongooseIdAssigner, NormalisedOptions } from '../MongooseIdAssigner';
import {
  getNextIdNumber,
  getNextIdString,
  getNextIdUUID,
} from './get-next-ids';
import { checkAndUpdateOptions } from './initialise-options';
import { PluginError, waitPromise } from './others';
import { isNumber, isObjectId, isString, isUUID } from './type-guards';

export async function refreshOptions(
  assigner: MongooseIdAssigner,
  retries = 0,
): Promise<void> {
  const collection = assigner.collection;

  try {
    const freshOptions = await collection.findOne<NormalisedOptions>({
      modelName: assigner.modelName,
    });

    if (!freshOptions && assigner.options.network && assigner.readyState) {
      if (retries < 10) {
        await waitPromise(10 * retries); // wait and retry
        return refreshOptions(assigner, ++retries);
      }
      return Promise.reject(
        PluginError(
          'Stored Options not Found for Ready Model!',
          assigner.modelName,
        ),
      );
    }

    // todo Handle this case
    if (!freshOptions) {
      return Promise.reject(
        PluginError('AssignId unexpectedly not Ready', assigner.modelName),
      );
    }

    checkAndUpdateOptions(assigner.options, freshOptions as any);
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function assignIdNetwork(
  idAssigner: MongooseIdAssigner,
  doc: Document,
) {
  let dFields: Map<string, FieldConfig> | undefined;

  if (idAssigner.options.discriminators) {
    if ((doc as any)[idAssigner.discriminatorKey]) {
      dFields = idAssigner.options.discriminators.get(
        (doc as any)[idAssigner.discriminatorKey],
      );
    }
  }

  if (!idAssigner.options.fields && !dFields) {
    return;
  }

  try {
    const fields = idAssigner.options.fields;

    await idAssigner.refreshOptions();
    if (fields) {
      for (const [field, config] of fields.entries()) {
        if (dFields && dFields.get(field)) {
          continue;
        }

        if (isObjectId(config)) {
          (doc as any)[field] = new ObjectId();
          continue;
        }

        if (isUUID(config)) {
          (doc as any)[field] = getNextIdUUID(config);
          continue;
        }

        if (isNumber(config)) {
          (doc as any)[field] = await getNextIdNumber(
            field,
            idAssigner,
            config,
          );
          continue;
        }

        if (isString(config)) {
          (doc as any)[field] = await getNextIdString(
            field,
            idAssigner,
            config,
          );
        }
      }
    }

    if (dFields) {
      for (const [field, config] of dFields.entries()) {
        if (isObjectId(config)) {
          (doc as any)[field] = new ObjectId();
          continue;
        }

        if (isUUID(config)) {
          (doc as any)[field] = getNextIdUUID(config);
          continue;
        }

        if (isNumber(config)) {
          (doc as any)[field] = await getNextIdNumber(
            field,
            idAssigner,
            config,
            (doc as any)[idAssigner.discriminatorKey],
          );
          continue;
        }

        if (isString(config)) {
          (doc as any)[field] = await getNextIdString(
            field,
            idAssigner,
            config,
            (doc as any)[idAssigner.discriminatorKey],
          );
        }
      }
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export function assignIdNoNetwork(
  idAssigner: MongooseIdAssigner,
  doc: Document,
) {
  let dFields: Map<string, FieldConfig> | undefined;

  if (idAssigner.options.discriminators) {
    if ((doc as any)[idAssigner.discriminatorKey]) {
      dFields = idAssigner.options.discriminators.get(
        (doc as any)[idAssigner.discriminatorKey],
      );
    }
  }

  const fields = idAssigner.options.fields;

  if (!fields && !dFields) {
    return;
  }

  if (fields) {
    for (const [field, config] of fields.entries()) {
      if (dFields && dFields.get(field)) {
        continue;
      }

      if (isObjectId(config)) {
        (doc as any)[field] = new ObjectId();
        continue;
      }

      if (isUUID(config)) {
        (doc as any)[field] = getNextIdUUID(config);
      }
    }
  }

  if (dFields) {
    for (const [field, config] of dFields.entries()) {
      if (isObjectId(config)) {
        (doc as any)[field] = new ObjectId();
        continue;
      }

      if (isUUID(config)) {
        (doc as any)[field] = getNextIdUUID(config);
      }
    }
  }
}

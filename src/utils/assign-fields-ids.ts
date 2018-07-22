import { ObjectId } from 'mongodb';
import { Document } from 'mongoose';
import { MongooseIdAssigner, NormalisedOptions } from '../MongooseIdAssigner';
import { getNextIdNumber, getNextIdString, getNextIdUUID } from './get-next-ids';
import { checkAndUpdateOptions } from './initialise-options';
import { throwPluginError } from './others';
import { isNumber, isObjectId, isString, isUUID } from './type-guards';

export async function refreshOptions(
  assigner: MongooseIdAssigner,
): Promise<void> {
  const collection = assigner.collection;

  try {
    const freshOptions = await collection.findOne<NormalisedOptions>({
      modelName: assigner.modelName,
    });

    if (!freshOptions && assigner.isReady) {
      throwPluginError(
        'Stored Options not Found for Ready Model!',
        assigner.modelName,
      );
    }

    // todo Handle this case
    if (!freshOptions) {
      throwPluginError('AssignId unexpectedly not Ready', assigner.modelName);
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
  if (!idAssigner.options.fields) {
    return;
  }

  try {
    const fields = idAssigner.options.fields;
    for (const [ field, options ] of fields) {
      if (isObjectId(options)) {
        (doc as any)[ field ] = new ObjectId();
        continue;
      }

      if (isUUID(options)) {
        (doc as any)[ field ] = getNextIdUUID(options);
        continue;
      }

      await idAssigner.refreshOptions();

      if (isNumber(options)) {
        (doc as any)[ field ] = await getNextIdNumber(field, idAssigner, options);
        continue;
      }

      if (isString(options)) {
        (doc as any)[ field ] = await getNextIdString(field, idAssigner, options);
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
  const fields = idAssigner.options.fields;

  if (!fields) {
    return;
  }

  for (const [ field, options ] of fields.entries()) {
    if (isObjectId(options)) {
      (doc as any)[ field ] = new ObjectId();
      continue;
    }

    if (isUUID(options)) {
      (doc as any)[ field ] = getNextIdUUID(options);
    }
  }
}

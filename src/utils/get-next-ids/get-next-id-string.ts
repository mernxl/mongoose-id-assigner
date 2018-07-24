import { StringFieldConfig } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { waitPromise } from '../index';
import { stringIncrementer } from './utils/string-incrementer';

export async function getNextIdString(
  field: string,
  idAssigner: MongooseIdAssigner,
  fieldConfig: StringFieldConfig,
  retries = 1,
  getOnly = false,
): Promise<string> {
  const nextId = fieldConfig.nextId;

  if (getOnly) {
    return nextId;
  }

  let incId = fieldConfig.nextId;

  if (fieldConfig.incFn) {
    incId = fieldConfig.incFn(nextId);
  } else {
    incId = stringIncrementer(nextId, fieldConfig.separator);
  }

  try {
    const updateField = `fields.${field}.nextId`;
    const update = await idAssigner.collection.findOneAndUpdate(
      {
        modelName: idAssigner.modelName,
        [updateField]: nextId,
      },
      { $set: { [updateField]: incId } },
      { projection: { value: 1 } },
    );

    if (update.ok && !update.value && retries < idAssigner.retryTime) {
      const multiplier = Math.abs(Math.random() * retries);
      await waitPromise(idAssigner.retryMillis * multiplier);
      await idAssigner.refreshOptions();
      return getNextIdString(field, idAssigner, fieldConfig, ++retries);
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return nextId;
}

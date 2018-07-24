import { NumberFieldConfig } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { waitPromise } from '../index';

export async function getNextIdNumber(
  field: string,
  idAssigner: MongooseIdAssigner,
  fieldConfig: NumberFieldConfig,
  retries = 1,
  getOnly = false,
): Promise<number> {
  const nextId = fieldConfig.nextId;

  if (getOnly) {
    return nextId;
  }

  let genId = fieldConfig.nextId;

  if (fieldConfig.incFn) {
    genId = fieldConfig.incFn(nextId, fieldConfig.incrementBy);
  } else {
    genId = nextId + (fieldConfig.incrementBy ? fieldConfig.incrementBy : 1);
  }

  try {
    const updateField = `fields.${field}.nextId`;
    const update = await idAssigner.collection.findOneAndUpdate(
      {
        modelName: idAssigner.modelName,
        [updateField]: nextId,
      },
      { $set: { [updateField]: genId } },
      { projection: { value: 1 } },
    );

    if (update.ok && !update.value && retries < idAssigner.retryTime) {
      const multiplier = Math.abs(Math.random() * retries);
      await waitPromise(idAssigner.retryMillis * multiplier);
      await idAssigner.refreshOptions();
      return getNextIdNumber(field, idAssigner, fieldConfig, ++retries);
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return nextId;
}

import { NumberFieldConfig } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { throwPluginError, waitPromise } from '../index';

export async function getNextIdNumber(
  field: string,
  idAssigner: MongooseIdAssigner,
  fieldConfig: NumberFieldConfig,
  discriminatorName = '',
  retries = 1,
  getOnly = false,
): Promise<number> {
  const nextId = fieldConfig.nextId;

  if (getOnly) {
    return nextId;
  }

  let afterNextId = fieldConfig.nextId;

  if (fieldConfig.nextIdFunction) {
    afterNextId = fieldConfig.nextIdFunction(nextId, fieldConfig.incrementBy);
  } else {
    afterNextId =
      nextId + (fieldConfig.incrementBy ? fieldConfig.incrementBy : 1);
  }

  try {
    const updateField = discriminatorName
      ? `discriminators.${discriminatorName}.${field}.nextId`
      : `fields.${field}.nextId`;
    const update = await idAssigner.collection.findOneAndUpdate(
      {
        modelName: idAssigner.modelName,
        [updateField]: nextId,
      },
      {
        $set: { [updateField]: afterNextId },
        $currentDate: { timestamp: true },
      },
      { projection: { value: 1 } },
    );

    if (update.ok && !update.value && retries < idAssigner.retryTime) {
      const multiplier = Math.abs(Math.random() * retries);
      await waitPromise(idAssigner.retryMillis * multiplier);
      await idAssigner.refreshOptions();
      return getNextIdNumber(
        field,
        idAssigner,
        fieldConfig,
        discriminatorName,
        ++retries,
      );
    } else if (!update.value && retries > idAssigner.retryTime) {
      throwPluginError(
        `Maximum retryTime to set value attained!`,
        idAssigner.modelName,
        field,
      );
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return nextId;
}

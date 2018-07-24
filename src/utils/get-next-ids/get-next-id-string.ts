import { StringFieldConfig } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { throwPluginError, waitPromise } from '../index';
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

  let afterNextId = fieldConfig.nextId;

  if (fieldConfig.nextIdFunction) {
    afterNextId = fieldConfig.nextIdFunction(nextId);
  } else {
    afterNextId = stringIncrementer(nextId, fieldConfig.separator);
  }

  try {
    const updateField = `fields.${field}.nextId`;
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
      return getNextIdString(field, idAssigner, fieldConfig, ++retries);
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

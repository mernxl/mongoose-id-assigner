import { StringOptions } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { waitPromise } from '../index';
import { stringIncrementer } from './utils/string-incrementer';

export async function getNextIdString(
  field: string,
  idAssigner: MongooseIdAssigner,
  options: StringOptions,
  retries = 1,
  getOnly = false,
): Promise<string> {
  const nextId = options.nextId;

  if (getOnly) {
    return nextId;
  }

  let incId = options.nextId;

  if (options.incFn) {
    incId = options.incFn(nextId);
  } else {
    incId = stringIncrementer(nextId, options.separator);
  }

  try {
    const updateField = `fields.${field}.nextId`;
    const update = await idAssigner.collection.findOneAndUpdate(
      {
        modelName: idAssigner.modelName,
        [ updateField ]: nextId,
      },
      { $set: { [ updateField ]: incId } },
      { projection: { value: 1 } },
    );

    if (update.ok && !update.value && retries < idAssigner.retryTime) {
      const multiplier = Math.abs(Math.random() * retries);
      await waitPromise(idAssigner.retryMillis * multiplier);
      await idAssigner.refreshOptions();
      return getNextIdString(field, idAssigner, options, ++retries);
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return nextId;
}

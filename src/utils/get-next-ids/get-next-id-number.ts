import { NumberOptions } from '../../assigner.interfaces';
import { MongooseIdAssigner } from '../../MongooseIdAssigner';
import { waitPromise } from '../index';

export async function getNextIdNumber(
  field: string,
  idAssigner: MongooseIdAssigner,
  options: NumberOptions,
  retries = 1,
  getOnly = false,
): Promise<number> {
  const nextId = options.nextId;

  if (getOnly) {
    return nextId;
  }

  let genId = options.nextId;

  if (options.incFn) {
    genId = options.incFn(nextId, options.incrementBy);
  } else {
    genId = nextId + (options.incrementBy ? options.incrementBy : 1);
  }

  try {
    const updateField = `fields.${field}.nextId`;
    const update = await idAssigner.collection.findOneAndUpdate(
      {
        modelName: idAssigner.modelName,
        [ updateField ]: nextId,
      },
      { $set: { [ updateField ]: genId } },
      { projection: { value: 1 } },
    );

    if (update.ok && !update.value && retries < idAssigner.retryTime) {
      const multiplier = Math.abs(Math.random() * retries);
      await waitPromise(idAssigner.retryMillis * multiplier);
      await idAssigner.refreshOptions();
      return getNextIdNumber(field, idAssigner, options, ++retries);
    }
  } catch (e) {
    return Promise.reject(e);
  }

  return nextId;
}

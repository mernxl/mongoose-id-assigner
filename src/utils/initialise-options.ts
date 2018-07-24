import * as eventToPromise from 'event-to-promise';
import { Document, Model } from 'mongoose';
import { localStateStore } from '../LocalStateStore';
import { MongooseIdAssigner, NormalisedOptions } from '../MongooseIdAssigner';
import { isNumber, isString } from './type-guards';

// checks if options changed, update field initialIds
// checks if options contains no field configs, changes = false
export function checkAndUpdateOptions(
  options: NormalisedOptions,
  dbOptions?: NormalisedOptions,
): { changes?: boolean; options: NormalisedOptions } {
  if (!dbOptions || !dbOptions.fields) {
    if (!options || !options.fields) {
      return { changes: false, options };
    }
    return { changes: true, options };
  }

  if (!options || !options.fields) {
    return { changes: false, options };
  }

  const rObject = { config: false, options };
  for (const [field, option] of options.fields.entries()) {
    const oldOption = (dbOptions as any).fields[field];
    if (isNumber(option) && oldOption && isNumber(oldOption)) {
      if (oldOption && option.nextId !== oldOption.nextId) {
        rObject.config = true;
        option.nextId = oldOption.nextId;
      }
    }

    if (isString(option) && oldOption && isString(oldOption)) {
      if (oldOption && option.nextId !== oldOption.nextId) {
        rObject.config = true;
        option.nextId = oldOption.nextId;
      }
    }
  }

  return rObject;
}

async function dbInitialiseLogic(
  mongooseModel: Model<Document>,
  assignId: MongooseIdAssigner,
): Promise<number> {
  const options = assignId.options;

  try {
    const oldOptions = await mongooseModel.db
      .collection(localStateStore.getCollName())
      .findOne({ modelName: options.modelName });

    const mergedOptions = checkAndUpdateOptions(options, oldOptions);

    if (mergedOptions.changes) {
      const update = await mongooseModel.db
        .collection(localStateStore.getCollName())
        .findOneAndReplace(
          { modelName: options.modelName },
          mergedOptions.options,
          {
            upsert: true,
          },
        );

      if (update.ok) {
        assignId.appendState({
          modelName: options.modelName,
          readyState: 1,
          model: mongooseModel,
        });
        return 1;
      } else {
        assignId.appendState({
          modelName: options.modelName,
          error: new Error(`AssignId Initialise Error!', ${options.modelName}`),
          readyState: 3,
        });
        return 3;
      }
    }

    assignId.appendState({
      modelName: options.modelName,
      readyState: 1,
      model: mongooseModel,
    });

    return 1;
  } catch (e) {
    assignId.appendState({
      modelName: options.modelName,
      error: e,
      readyState: 3,
    });
    return 3;
  }
}

export async function initialiseOptions(
  mongooseModel: Model<Document>,
  assignId: MongooseIdAssigner,
): Promise<number> {
  const options = assignId.options;

  if (!options.network) {
    assignId.appendState({
      modelName: options.modelName,
      model: mongooseModel,
      readyState: 1,
    });
    return 1;
  }

  // connecting
  if (mongooseModel.db.readyState === 2) {
    return await eventToPromise(mongooseModel.db, 'connected').then(() =>
      dbInitialiseLogic(mongooseModel, assignId),
    );

    // connected
  } else if (mongooseModel.db.readyState === 1) {
    return await dbInitialiseLogic(mongooseModel, assignId);
  }
  return 0;
  // disconnecting, disconnected
}

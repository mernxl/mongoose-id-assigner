import * as eventToPromise from 'event-to-promise';
import { Document, Model } from 'mongoose';
import { localStateStore } from '../LocalStateStore';
import { MongooseIdAssigner, NormalisedOptions } from '../MongooseIdAssigner';
import { throwPluginError, waitPromise } from './others';
import { isNumber, isString } from './type-guards';

interface OptionsCheckResults {
  abort?: boolean; // if no fresh, no options
  replace?: boolean; // if there are replace to from fresh config
  delete?: boolean; // if freshOptions exist, but local config doesn't need it.
  options: NormalisedOptions;
}

// checks if fieldConfigs changed, update field nextIds only
// checks if AssignerOptions contains no field configs, replace = false
export function checkAndUpdateOptions(
  options: NormalisedOptions,
  freshOptions?: NormalisedOptions,
): OptionsCheckResults {
  if (!freshOptions || !freshOptions.fields) {
    if (!options || !options.fields) {
      return { abort: true, options };
    } else {
      options.timestamp = null;
      return { replace: true, options };
    }
  }

  // set timestamp
  options.timestamp = freshOptions.timestamp;

  // delete old options if new doesn't need it
  if (!options || !options.fields) {
    return { delete: true, options };
  }

  const rObject = { replace: false, options };
  for (const [field, config] of options.fields.entries()) {
    const oldConfig = (freshOptions as any).fields[field];

    if (!oldConfig) {
      rObject.replace = true;
    }

    if (isNumber(config) && isNumber(oldConfig)) {
      if (oldConfig && config.nextId !== oldConfig.nextId) {
        rObject.replace = true;
        config.nextId = oldConfig.nextId;
      }
    }

    if (isString(config) && isString(oldConfig)) {
      if (oldConfig && config.nextId !== oldConfig.nextId) {
        rObject.replace = true;
        config.nextId = oldConfig.nextId;
      }
    }
  }

  return rObject;
}

async function refreshDBOptions(
  mongooseModel: Model<Document>,
  assignId: MongooseIdAssigner,
  retries = 0,
): Promise<number> {
  const options = assignId.options;
  try {
    const freshOptions = await mongooseModel.db
      .collection(localStateStore.getCollName())
      .findOne({ modelName: options.modelName });

    const mergedOptions = checkAndUpdateOptions(options, freshOptions);

    if (mergedOptions.abort) {
      assignId.appendState({
        modelName: options.modelName,
        readyState: 1,
        model: mongooseModel,
      });

      return 1;
    }

    let update;

    if (mergedOptions.replace) {
      update = await mongooseModel.db
        .collection(localStateStore.getCollName())
        .findOneAndReplace(
          {
            modelName: options.modelName,
            timestamp: mergedOptions.options.timestamp,
          },
          mergedOptions.options,
          {
            upsert: true,
          },
        );
    } else if (mergedOptions.delete) {
      update = await mongooseModel.db
        .collection(localStateStore.getCollName())
        .findOneAndDelete({
          modelName: options.modelName,
          timestamp: mergedOptions.options.timestamp,
        });

      // new options requests deletion of old options
      // but those options have been updated by another process
      if (!update || !update.ok) {
        throwPluginError(
          'Error at initialisation, cannot delete old options, Still in use!',
          options.modelName,
        );
      }
    }

    if (update && update.ok) {
      assignId.appendState({
        readyState: 1,
        model: mongooseModel,
      });
      return 1;
    } else {
      throwPluginError(`Initialisation error ${update}`, options.modelName);
      return 3;
    }
  } catch (e) {
    if (e.code === 11000) {
      if (retries > 30) {
        throwPluginError(
          'Initialisation error, maximum retries attained',
          options.modelName,
        );
      }
      return refreshDBOptions(mongooseModel, assignId, ++retries);
    }
    return Promise.reject(e);
  }
}

async function dbInitialiseLogic(
  mongooseModel: Model<Document>,
  assignId: MongooseIdAssigner,
): Promise<number> {
  const options = assignId.options;

  try {
    // create index, ensures no duplicates during upserts
    await mongooseModel.db
      .collection(localStateStore.getCollName())
      .createIndex('modelName', {
        unique: true,
        background: false,
      });

    return await refreshDBOptions(mongooseModel, assignId);
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
  retries = 0,
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

  if (retries < 10) {
    try {
      // 3 - disconnecting, wait more
      // 0 - disconnected, wait less as connection can be back anytime.
      await waitPromise(
        (mongooseModel.db.readyState === 3 ? 500 : 100) * retries,
      );

      return initialiseOptions(mongooseModel, assignId, ++retries);
    } catch (e) {
      return Promise.reject(e);
    }
  } else {
    throwPluginError(
      'Initialisation failed, cannot establish db connection not established!',
    );
    return 0;
  }
}

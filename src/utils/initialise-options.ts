import * as eventToPromise from 'event-to-promise';
import { Document, Model } from 'mongoose';
import { FieldConfig } from '../assigner.interfaces';
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

function checkAndUpdateFieldConfigMap(
  fieldConfigMap?: Map<string, FieldConfig>,
  freshFieldConfigObj?: any,
): boolean {
  if (!freshFieldConfigObj || !fieldConfigMap) {
    return true;
  }

  let replace = true;

  for (const [field, config] of fieldConfigMap.entries()) {
    const oldConfig = freshFieldConfigObj[field];

    if (!oldConfig) {
      replace = true;
    }

    if (isNumber(config) && isNumber(oldConfig)) {
      if (oldConfig && config.nextId !== oldConfig.nextId) {
        replace = true;
        config.nextId = oldConfig.nextId;
      }
    }

    if (isString(config) && isString(oldConfig)) {
      if (oldConfig && config.nextId !== oldConfig.nextId) {
        replace = true;
        config.nextId = oldConfig.nextId;
      }
    }

    // fixme sort this issue out
    // throw error, or if dev tag, if reset true... then override
    // updated info on README.md until better fix, override
    if (config.type !== oldConfig.type) {
      replace = true;
    }
  }

  return replace;
}

// checks if fieldConfigs changed, update field nextIds only
// checks if AssignerOptions contains no field configs, replace = false
export function checkAndUpdateOptions(
  options: NormalisedOptions,
  freshOptions?: NormalisedOptions,
): OptionsCheckResults {
  if (!freshOptions || (!freshOptions.fields && !freshOptions.discriminators)) {
    if (!options.fields && !options.discriminators) {
      return { abort: true, options };
    } else {
      options.timestamp = null;
      return { replace: true, options };
    }
  }

  // set timestamp
  options.timestamp = freshOptions.timestamp;

  // delete old options if new doesn't need it
  if (!options || (!options.fields && !options.discriminators)) {
    return { delete: true, options };
  }

  const rObject = { replace: true, options };

  rObject.replace = checkAndUpdateFieldConfigMap(
    options.fields,
    freshOptions.fields,
  );

  // if discriminator options available
  if (options.discriminators) {
    for (const [dName, fieldConfigMap] of options.discriminators.entries()) {
      const replace = checkAndUpdateFieldConfigMap(
        fieldConfigMap,
        freshOptions ? (freshOptions as any).discriminators[dName] : undefined,
      );

      if (replace) {
        rObject.replace = true;
      }
    }
  }

  return rObject;
}

async function refreshDBOptions(
  mongooseModel: Model<Document>,
  idAssigner: MongooseIdAssigner,
  retries = 0,
): Promise<number> {
  const options = idAssigner.options;
  try {
    const freshOptions = await mongooseModel.db
      .collection(localStateStore.getCollName())
      .findOne({ modelName: idAssigner.modelName });

    const mergedOptions = checkAndUpdateOptions(options, freshOptions);

    if (mergedOptions.abort) {
      idAssigner.appendState({
        modelName: idAssigner.modelName,
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
            modelName: idAssigner.modelName,
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
          modelName: idAssigner.modelName,
          timestamp: mergedOptions.options.timestamp,
        });

      // new options requests deletion of old options
      // but those options have been updated by another process
      if (!update || !update.ok) {
        throwPluginError(
          'Error at initialisation, cannot delete old options, Still in use!',
          idAssigner.modelName,
        );
      }
    }

    if (update && update.ok) {
      idAssigner.appendState({
        readyState: 1,
        model: mongooseModel,
      });
      return 1;
    } else {
      throwPluginError(`Initialisation error ${update}`, idAssigner.modelName);
      return 3;
    }
  } catch (e) {
    if (e.code === 11000) {
      if (retries > 30) {
        throwPluginError(
          'Initialisation error, maximum retries attained',
          idAssigner.modelName,
        );
      }
      return refreshDBOptions(mongooseModel, idAssigner, ++retries);
    }
    return Promise.reject(e);
  }
}

async function dbInitialiseLogic(
  mongooseModel: Model<Document>,
  idAssigner: MongooseIdAssigner,
): Promise<number> {
  try {
    // create index, ensures no duplicates during upserts
    await mongooseModel.db
      .collection(localStateStore.getCollName())
      .createIndex('modelName', {
        unique: true,
        background: false,
      });

    return await refreshDBOptions(mongooseModel, idAssigner);
  } catch (e) {
    idAssigner.appendState({
      modelName: idAssigner.modelName,
      error: e,
      readyState: 3,
    });
    return 3;
  }
}

export async function initialiseOptions(
  mongooseModel: Model<Document>,
  idAssigner: MongooseIdAssigner,
  retries = 0,
): Promise<number> {
  const options = idAssigner.options;

  if (!options.network) {
    idAssigner.appendState({
      modelName: idAssigner.modelName,
      model: mongooseModel,
      readyState: 1,
    });
    return 1;
  }

  // connecting
  if (mongooseModel.db.readyState === 2) {
    return await eventToPromise(mongooseModel.db, 'connected').then(() =>
      dbInitialiseLogic(mongooseModel, idAssigner),
    );

    // connected
  } else if (mongooseModel.db.readyState === 1) {
    return await dbInitialiseLogic(mongooseModel, idAssigner);
  }

  if (retries < 10) {
    try {
      // 3 - disconnecting, wait more
      // 0 - disconnected, wait less as connection can be back anytime.
      await waitPromise(
        (mongooseModel.db.readyState === 3 ? 500 : 100) * retries,
      );

      return initialiseOptions(mongooseModel, idAssigner, ++retries);
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

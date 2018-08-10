import { Document } from 'mongoose';
import { MongooseIdAssigner } from '../MongooseIdAssigner';
import { assignIdNetwork, assignIdNoNetwork } from './assign-fields-ids';
import { throwPluginError } from './others';

function configureIndexes(assignId: MongooseIdAssigner) {
  const schema = assignId.schema;
  const fields = assignId.options.fields;

  if (!fields) {
    return;
  }

  for (const [field, config] of fields.entries()) {
    if (field === '_id') {
      continue;
    }

    if (config.index) {
      schema.index({ [field]: -1 }, { unique: config.unique });
    }
  }
}

function configurePreSave(assigner: MongooseIdAssigner) {
  const options = assigner.options;
  const schema = assigner.schema;

  schema.pre('save', async function(this: Document, next) {
    const doc = this as any;

    try {
      if (doc.isNew) {
        if (assigner.state.error) {
          return Promise.reject(
            throwPluginError(
              `Cannot assign field ids, Error on Init. [${
                assigner.state.error
              }]`,
              assigner.modelName,
            ),
          );
        }

        if (assigner.readyState !== 1) {
          await assigner.initialise(this.model(assigner.modelName));
        }

        if (!options.network) {
          assignIdNoNetwork(assigner, doc);
        } else {
          await assignIdNetwork(assigner, doc);
        }
      }
    } catch (e) {
      return next(e);
    }

    return next();
  });
}

export function configureSchema(idAssigner: MongooseIdAssigner) {
  configureIndexes(idAssigner);
  configurePreSave(idAssigner);
}

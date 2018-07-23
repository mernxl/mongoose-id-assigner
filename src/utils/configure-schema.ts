import { ObjectId } from 'mongodb';
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

  for (const [field, options] of fields.entries()) {
    if (field === '_id') {
      continue;
    }

    if (options.index) {
      schema.index({ [field]: -1 }, { unique: options.unique });
    }
  }
}

function configurePreSave(assigner: MongooseIdAssigner) {
  const options = assigner.options;
  const schema = assigner.schema;

  schema.pre('save', async function(this: Document, next) {
    const doc = this as any;

    try {
      if (doc.isNew || doc.e11000) {
        // if no fields, then assign _id

        if (!options.fields) {
          doc._id = new ObjectId();
          return next();
        }

        if (assigner.state.error) {
          return Promise.reject(
            throwPluginError(
              `Cannot assign field ids, Error on Init. [${
                assigner.state.error
              }]`,
              options.modelName,
            ),
          );
        }

        if (!assigner.isReady) {
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

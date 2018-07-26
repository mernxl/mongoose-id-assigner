import { Schema } from 'mongoose';
import { AssignerOptions, FieldConfigTypes } from '../../assigner.interfaces';
import { checkAndUpdateOptions } from '../initialise-options';
import { normaliseOptions } from '../normalise-options';

describe('initialise-options ->', () => {
  const schema = new Schema({});
  const options: AssignerOptions = {
    modelName: 'Person',
    fields: {
      _id: true,
      clientId: true,
      withUUID: 'UUID',
      String: '5555',
      Number: 5555,
      last: {
        type: FieldConfigTypes.Number,
        nextId: 5641,
      },
    },
    discriminators: {
      droid: {
        clone: 555,
      },
    },
  };

  describe('checkAndUpdateOptions()', () => {
    it('should return current option if fresh UnAvailable', async () => {
      const normalised = normaliseOptions(schema, options);
      expect(checkAndUpdateOptions(normalised, '' as any).options).toEqual(
        normalised,
      );
    });
  });
});

import { AssignerOptions, FieldConfigTypes } from '../../assigner.interfaces';
import { checkAndUpdateOptions } from '../initialise-options';
import { normaliseOptions } from '../normalise-options';

describe('initialise-options ->', () => {
  const options: AssignerOptions = {
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
      const normalised = normaliseOptions('Person', options);
      expect(checkAndUpdateOptions(normalised, '' as any).options).toEqual(normalised);
    });
  });
});

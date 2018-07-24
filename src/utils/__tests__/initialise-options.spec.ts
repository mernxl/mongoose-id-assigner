import { AssignerOptions, FieldConfigTypes } from '../../assigner.interfaces';
import { checkAndUpdateOptions } from '../initialise-options';
import { normaliseOptions } from '../normalise-options';

describe('initialise-options ->', () => {
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
  };

  const normalised = normaliseOptions(options);

  describe('checkAndUpdateOptions()', () => {
    it('should return current option if freshUnAvailable', async () => {
      expect(checkAndUpdateOptions(normalised, '' as any).options).toEqual(
        normalised,
      );
    });
  });
});

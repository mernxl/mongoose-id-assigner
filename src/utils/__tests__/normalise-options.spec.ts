import {
  AssignerOptions,
  FieldConfig,
  FieldConfigTypes,
} from '../../assigner.interfaces';
import { NormalisedOptions } from '../../MongooseIdAssigner';
import { normaliseOptions } from '../normalise-options';

const incFn = function(nextId: number) {
  return nextId + 1;
};

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
      incFn,
    },
  },
};

const expected: NormalisedOptions = {
  modelName: 'Person',
  network: true,
  fields: new Map<string, FieldConfig>([
    ['_id', { type: FieldConfigTypes.ObjectId }],
    ['clientId', { type: FieldConfigTypes.ObjectId }],
    ['withUUID', { type: FieldConfigTypes.UUID, version: 4 }],
    ['String', { type: FieldConfigTypes.String, nextId: '5555' }],
    ['Number', { type: FieldConfigTypes.Number, nextId: 5555 }],
    ['last', { type: FieldConfigTypes.Number, nextId: 5641, incFn }],
  ]),
};

describe('normaliseOptions()', () => {
  it('should throw Error if Type not found', () => {
    expect(() =>
      normaliseOptions({
        modelName: 'AAA',
        fields: {
          _id: {
            type: '404',
          },
        } as any,
      }),
    ).toThrowError(
      '[MongooseIdAssigner], Model: AAA, Unknown Field Type for field [_id]',
    );
  });

  it('should normalise options', () => {
    expect(normaliseOptions(options)).toEqual(expected);
  });
});

import { Connection } from 'mongoose';
import { getMongoose } from '../__mocks__/mongoose.config';
import { getSchema } from '../__mocks__/test.models';
import { LocalStateStore, localStateStore, SchemaState } from '../LocalStateStore';
import { MongooseIdAssigner } from '../MongooseIdAssigner';

const ExampleSchema = getSchema(0);
let connection: Connection;

beforeAll(async () => {
  connection = await getMongoose();
});

afterAll(async () => {
  await connection.close();
});

describe('LocalStateStore', () => {
  afterEach(async () => {
    await connection.dropDatabase();
  });

  describe('basics', () => {
    it('should be a singleton class', () => {
      expect(new LocalStateStore()).toEqual(localStateStore);
    });

    it('should clear State by calling localStateStore.clear()', () => {
      MongooseIdAssigner.plugin(ExampleSchema, {
        modelName: 'example',
      });

      expect(localStateStore.getState(ExampleSchema)).toBeTruthy();

      localStateStore.clear();

      expect(localStateStore.getState(ExampleSchema)).toBeFalsy();
    });
  });

  describe('setCollName()', () => {
    let exampleIA: MongooseIdAssigner;
    let count = 0;
    let modelName = '';

    beforeEach(() => {
      modelName = 'Example' + ++count;
    });

    it('should set Assigner collection Name', async () => {
      // at bootstrapping, before any IA initialises
      localStateStore.clear();
      localStateStore.setCollName('newName');
      exampleIA = new MongooseIdAssigner(ExampleSchema, { modelName });
      const ExampleModel = connection.model(modelName, ExampleSchema);

      try {
        await exampleIA.initialise(ExampleModel);
        expect(exampleIA.collection.collectionName).toBe('newName');
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });

    it('should throw Error if an Assigner already Initialised', async () => {
      localStateStore.clear();
      exampleIA = new MongooseIdAssigner(ExampleSchema, { modelName });
      const ExampleModel = connection.model(modelName, ExampleSchema);

      try {
        await exampleIA.initialise(ExampleModel);
        expect(() => localStateStore.setCollName('newName')).toThrowError(/(setCollName)/);
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });
  });

  describe('Relation with IdAssigner', () => {
    let exampleIA: MongooseIdAssigner;

    beforeAll(() => {
      localStateStore.clear();
      exampleIA = new MongooseIdAssigner(ExampleSchema, {
        modelName: 'example',
      });
    });

    it('should emit events on idAssigner corresponding to idAssigner readyState', async () => {
      expect.assertions(3);
      const data: SchemaState = {
        idAssigner: exampleIA,
        modelName: 'example',
        readyState: 1,
      };

      exampleIA.on('ready', () => {
        expect(exampleIA.readyState).toBe(1);
        localStateStore.setState(ExampleSchema, {
          ...data,
          readyState: 0,
        });
      });
      exampleIA.on('unready', () => {
        expect(exampleIA.readyState).toBe(0);
        localStateStore.setState(ExampleSchema, {
          ...data,
          readyState: -1,
        });
      });
      exampleIA.on('error', () => {
        expect(exampleIA.readyState).toBe(-1);
      });
      localStateStore.setState(ExampleSchema, {
        ...data,
        readyState: 1,
      });
    });
  });
});

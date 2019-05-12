import { Binary } from 'bson';
import { Document, Model, Schema, Types } from 'mongoose';
import { getMongoose } from '../__mocks__/mongoose.config';
import { getSchema } from '../__mocks__/test.models';
import {
  AssignerPluginOptions,
  FieldConfigTypes,
} from '../assigner.interfaces';
import { localStateStore } from '../LocalStateStore';
import { MongooseIdAssigner } from '../MongooseIdAssigner';

const mongoose = getMongoose();

afterAll(async () => {
  await mongoose.disconnect();
});

describe('MongooseIdAssigner', () => {
  let exampleSchema: Schema;
  let modelName: string;
  let count = 0;

  beforeEach(() => {
    modelName = 'ex' + ++count;
    exampleSchema = getSchema(1);
    localStateStore.clear();
  });

  let exampleModel: Model<Document>;

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  describe('basics', () => {
    it('should throw error if no schema passed at Constructor', () => {
      expect(
        () => new MongooseIdAssigner('' as any, { modelName }),
      ).toThrowError(/(Schema for the IdAssigner Must be provided!)/);
    });

    it('should throw error if no option or modelName passed at Constructor', () => {
      expect(
        () => new MongooseIdAssigner(exampleSchema, undefined as any),
      ).toThrowError(
        /(Plugin Options must be specified, with schema modelName!)/,
      );
    });

    it('should save state to localStateStore', () => {
      MongooseIdAssigner.plugin(exampleSchema, {
        modelName: 'example',
      });

      expect(localStateStore.getState(exampleSchema)).toBeDefined();
    });

    it('should assign _id field if only modelName option passed', async () => {
      exampleSchema.plugin(MongooseIdAssigner.plugin, {
        modelName: 'example1',
      });

      exampleModel = mongoose.model('example1', exampleSchema);

      const doc = await exampleModel.create({ personId: 'mernxl' });

      expect(doc._id).toBeTruthy();
    });

    it('should create noNetwork with UUID and ObjectId', async () => {
      const ExampleIA = new MongooseIdAssigner(exampleSchema, {
        modelName: 'example4',
        fields: {
          _id: FieldConfigTypes.UUID,
          objectIdField: FieldConfigTypes.ObjectId,
        },
      });

      exampleModel = mongoose.model('example4', exampleSchema);

      try {
        const doc = await exampleModel.create({ personId: 'mernxl' });

        expect(ExampleIA.options.network).toBe(false);
        expect((doc as any).objectIdField).toBeInstanceOf(Types.ObjectId);
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });

    it('should assign _ids to Model instances with options', async () => {
      exampleSchema.plugin(MongooseIdAssigner.plugin, {
        modelName: 'example5',
        fields: {
          _id: {
            type: FieldConfigTypes.String,
            separator: 'T',
            nextId: '34T5565',
          },
        },
      });

      exampleModel = mongoose.model('example5', exampleSchema);

      try {
        const doc = await exampleModel.create({ personId: 'mernxl' });

        expect(doc._id).toBe('34T5565');
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });

    it('should assign multiple ids to fields', async () => {
      const options: AssignerPluginOptions = {
        modelName: 'example6',
        fields: {
          _id: '33333',
          photoId: 44444,
          emailId: '55555',
          personId: '66666',
          uuidField: {
            type: FieldConfigTypes.GUID,
            asBinary: true,
            version: 4,
          },
        },
      };

      exampleSchema.plugin(MongooseIdAssigner.plugin, options);
      exampleModel = mongoose.model('example6', exampleSchema);

      try {
        const doc = await exampleModel.create({ personId: 'mernxl' });
        const doc2 = await exampleModel.create({ personId: 'mernxl' });

        expect([doc._id, doc2._id]).toEqual(
          expect.arrayContaining(['33333', '33334']),
        );
        expect((doc as any).photoId).not.toBe((doc2 as any).photoId);
        expect([(doc as any).photoId, (doc2 as any).photoId]).toEqual(
          expect.arrayContaining([44444, 44445]),
        );
        expect((doc as any).emailId).not.toBe((doc2 as any).emailId);
        expect([(doc as any).emailId, (doc2 as any).emailId]).toEqual(
          expect.arrayContaining(['55555', '55556']),
        );
        expect((doc as any).personId).not.toBe((doc2 as any).personId);
        expect([(doc as any).personId, (doc2 as any).personId]).toEqual(
          expect.arrayContaining(['66666', '66667']),
        );
        expect((doc as any).uuidField).not.toBe((doc2 as any).uuidField);
        expect((doc as any).uuidField).toBeInstanceOf(Binary);
        expect((doc2 as any).uuidField).toBeInstanceOf(Binary);
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });

    it('should use nextIdFunction passed at fieldConfig', async () => {
      const options: AssignerPluginOptions = {
        modelName: 'example7',
        fields: {
          _id: '33333',
          photoId: {
            type: FieldConfigTypes.Number,
            nextId: 44444,
            nextIdFunction: (nextId: number) => nextId + 2,
          },
          personId: {
            type: FieldConfigTypes.String,
            nextId: '55555',
            nextIdFunction: (nextId: string) =>
              (parseInt(nextId, 10) + 2).toString(),
          },
        },
      };

      try {
        MongooseIdAssigner.plugin(exampleSchema, options);

        exampleModel = mongoose.model('example7', exampleSchema);

        const doc1 = await exampleModel.create({ personId: 'placeholder' });
        const doc2 = await exampleModel.create({ personId: 'placeholder' });

        expect((doc1 as any).photoId).toBe(44444);
        expect((doc1 as any).personId).toBe('55555');
        expect((doc2 as any).photoId).toBe(44446);
        expect((doc2 as any).personId).toBe('55557');
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });

    it('should be robust enough to avoid duplicates', async () => {
      const options: AssignerPluginOptions = {
        modelName: 'example8',
        fields: {
          _id: '33333',
          photoId: 44444,
          emailId: '55555',
          personId: {
            type: FieldConfigTypes.String,
            nextId: 'SPEC-7382-4344-3232',
            separator: '-',
          },
          uuidFieldString: {
            type: FieldConfigTypes.UUID,
          },
          uuidFieldBuffer: {
            type: FieldConfigTypes.UUID,
            version: 1,
            asBinary: true,
          },
          objectIdField: FieldConfigTypes.ObjectId,
        },
      };

      try {
        const ExampleIA = new MongooseIdAssigner(exampleSchema, options);

        exampleModel = mongoose.model('example8', exampleSchema);
        expect(ExampleIA.readyState).toBe(0); // initialising

        // initialise to ensure that
        // model is set and db is connected
        // before performing heavy tasks
        // or you can set max event listeners to 100 to suppress warnings on waits
        await ExampleIA.initialise(exampleModel);

        expect(ExampleIA.readyState).toBe(1);

        const promises = [];
        for (let i = 0; i < 100; i++) {
          promises.push(exampleModel.create({ personId: 'mernxl' }));
        }

        const docs: any[] = await Promise.all(promises);
        for (let i = 0; i < 100; i++) {
          const _id = docs[i]._id;
          const photoId = docs[i].photoId;
          const emailId = docs[i].emailId;
          const personId = docs[i].personId;
          const uuidFieldString = docs[i].uuidFieldString;
          const uuidFieldBuffer = docs[i].uuidFieldBuffer;
          const objectIdField = docs[i].objectIdField;
          expect(typeof photoId).toBe('number');
          expect(typeof emailId).toBe('string');
          expect(personId).toMatch(/(SPEC-7382-4344-3)\d+/);
          expect(objectIdField).toBeInstanceOf(Types.ObjectId);
          expect(typeof uuidFieldString).toBe('string');
          expect(uuidFieldBuffer).toBeInstanceOf(Binary);

          for (const cDoc of docs) {
            if (_id === cDoc._id) {
              continue;
            }
            expect(photoId).not.toBe(cDoc.photoId);
            expect(emailId).not.toBe(cDoc.emailId);
            expect(personId).not.toBe(cDoc.personId);
            expect(objectIdField).not.toBe(cDoc.objectIdField);
            expect(uuidFieldString).not.toEqual(cDoc.uuidFieldString);
            expect(uuidFieldBuffer).not.toEqual(cDoc.uuidFieldBuffer);
          }
        }
      } catch (e) {
        expect(e).toBeUndefined();
      }
    });
  });

  describe('instance', () => {
    describe('collection', () => {
      it('should return the IdAssigner Collection', async () => {
        const ExampleIA = new MongooseIdAssigner(exampleSchema, { modelName });
        exampleModel = mongoose.model(modelName, exampleSchema);

        await ExampleIA.initialise(exampleModel);

        expect(ExampleIA.collection.collectionName).toMatch(
          localStateStore.getCollName(),
        );
      });

      it('should throw error if IdAssigner not Initialise', async () => {
        const ExampleIA = new MongooseIdAssigner(exampleSchema, { modelName });

        expect(() => ExampleIA.collection).toThrowError(
          /(Cannot read Model, Not Initialised)/,
        );
      });

      it('should throw error if IdAssigner Errored on initialise', async () => {
        const ExampleIA = new MongooseIdAssigner(exampleSchema, { modelName });

        ExampleIA.appendState({ error: new Error('I Occurred') });

        expect(() => ExampleIA.collection).toThrowError(
          /(Cannot read Model, Error At Initialisation Error: I Occurred)/,
        );
      });
    });

    describe('initialise()', () => {
      it('should initialise the plugin without passing model', () => {
        const ExampleIA = new MongooseIdAssigner(exampleSchema, {
          modelName: 'example9',
          fields: {
            _id: {
              type: FieldConfigTypes.String,
              separator: 'T',
              nextId: '34T5565',
            },
          },
        });

        exampleModel = mongoose.model('example9', exampleSchema);

        return ExampleIA.initialise(exampleModel)
          .then(state => expect(state).toBe(1))
          .catch(e => expect(e).toBeUndefined());
      });

      it('should return state if called multiple times', () => {
        expect.assertions(2);
        const ExampleIA = new MongooseIdAssigner(exampleSchema, {
          modelName: 'example10',
          fields: {
            _id: {
              type: FieldConfigTypes.String,
              separator: 'T',
              nextId: '34T5565',
            },
          },
        });

        exampleModel = mongoose.model('example10', exampleSchema);

        ExampleIA.initialise(exampleModel)
          .then(state => expect(state).toBe(1))
          .catch(e => expect(e).toBeUndefined());

        return ExampleIA.initialise(exampleModel)
          .then(state => expect(state).toBe(1))
          .catch(e => expect(e).toBeUndefined());
      });
    });

    describe('getNextId()', () => {
      it('should throw error message if field not found', async () => {
        const characterSchema = getSchema(1);

        const options: AssignerPluginOptions = {
          modelName: 'example13',
          discriminators: {
            Person13: {
              license: 4444,
            },
          },
        };

        const characterIA = new MongooseIdAssigner(characterSchema, options);

        try {
          await characterIA.getNextId('not-found', 'Person13');
        } catch (e) {
          expect(e.message).toMatch(
            /(\[not-found] does not have a Field Configuration)/,
          );
        }
      });
      it('should return nextId depending on fieldConfig', async () => {
        const exampleIA = new MongooseIdAssigner(exampleSchema, {
          modelName: 'example14',
          fields: {
            photoId: 4444,
          },
        });
        const model = mongoose.model('example14', exampleSchema);

        try {
          await model.create({ photoId: 21 });
          expect(await exampleIA.getNextId('photoId')).toBe(4445);
        } catch (e) {
          expect(e).toBeUndefined();
        }
      });
    });
  });

  describe('static', () => {
    describe('plugin()', () => {
      it('should throw error if no schema passed in', () => {
        expect(() =>
          MongooseIdAssigner.plugin('' as any, {} as any),
        ).toThrowError(/(Schema for the IdAssigner Must be provided!)/);
      });

      it('should throw error if no options passed', () => {
        expect(() =>
          MongooseIdAssigner.plugin(new Schema({}), '' as any),
        ).toThrowError(
          /(Plugin Options must be specified, with schema modelName!)/,
        );
      });

      it('should apply plugin to schema', async () => {
        MongooseIdAssigner.plugin(exampleSchema, {
          modelName,
        });

        exampleModel = mongoose.model(modelName, exampleSchema);

        const doc = await exampleModel.create({ personId: 'mernxl' });

        expect(doc._id).toBeTruthy();
      });
    });
  });

  describe('integrations', () => {
    describe('discriminators', () => {
      let characterSchema: Schema, personSchema: Schema, droidSchema: Schema;
      beforeEach(() => {
        characterSchema = getSchema(1);
        personSchema = getSchema(2);
        droidSchema = getSchema(3);
      });

      it('should create noNetwork discriminators', async () => {
        const options: AssignerPluginOptions = {
          modelName: 'example11',
          fields: {
            _id: FieldConfigTypes.GUID,
          },
          discriminators: {
            Person1: {
              license: FieldConfigTypes.ObjectId,
            },
            Droid1: {
              make: FieldConfigTypes.UUID,
            },
          },
        };

        const CharacterIA = new MongooseIdAssigner(characterSchema, options);
        const characterModel = mongoose.model('example11', characterSchema);
        const personModel = characterModel.discriminator(
          'Person1',
          personSchema,
        );
        const droidModel = characterModel.discriminator('Droid1', droidSchema);
        try {
          const character = await characterModel.create({
            friends: 'placeholder',
          });
          const person = await personModel.create({ friends: 'placeholder' });
          const droid = await droidModel.create({ friends: 'placeholder' });

          expect(CharacterIA.options.network).toBe(false);
          expect((character as any)._id).toMatch(/-+/);
          expect(typeof (person as any).license).toBe('string');
          expect((droid as any).make).toMatch(/-+/);
        } catch (e) {
          expect(e).toBeUndefined();
        }
      });

      it('should create discriminators network', async () => {
        const options: AssignerPluginOptions = {
          modelName: 'example12',
          fields: {
            someId: 4444,
          },
          discriminators: {
            Person: {
              _id: FieldConfigTypes.ObjectId,
              license: '786-TSJ-000', // default separator `-`
            },
            Droid: {
              _id: FieldConfigTypes.UUID,
              make: {
                type: FieldConfigTypes.String,
                nextId: '18Y4433',
                separator: 'Y',
              },
              timestamp: Date.now(),
            },
          },
        };

        characterSchema.plugin(MongooseIdAssigner.plugin, options);

        const characterModel = mongoose.model('example12', characterSchema);

        const personModel = characterModel.discriminator(
          'Person',
          personSchema,
        );

        droidSchema.path('_id', String);
        const droidModel = characterModel.discriminator('Droid', droidSchema);

        try {
          const character = await characterModel.create({
            friends: 'placeholder',
          });
          const person = await personModel.create({ friends: 'placeholder' });
          const droid = await droidModel.create({ friends: 'placeholder' });
          const person1 = await personModel.create({ friends: 'placeholder' });
          const droid1 = await droidModel.create({ friends: 'placeholder' });

          expect((character as any).someId).toBe(4444);
          expect(typeof (person as any)._id).toBe('string');
          expect((person as any).someId).toBe(4445);
          expect((person as any).license).toBe('786-TSJ-000');
          expect((droid as any)._id).toMatch(/-+/);
          expect((droid as any).someId).toBe(4446);
          expect((droid as any).make).toBe('18Y4433');

          expect((person1 as any).someId).toBe(4447);
          expect((person1 as any).license).toBe('786-TSJ-001');

          expect((droid1 as any).someId).toBe(4448);
          expect((droid1 as any).make).toBe('18Y4434');
        } catch (e) {
          expect(e).toBeUndefined();
        }
      });

      it('should request and update respective fields, even if configured at base and discriminators', async () => {
        const options: AssignerPluginOptions = {
          modelName,
          fields: {
            _id: '786-DEF-000',
            someId: 4444,
          },
          discriminators: {
            [modelName + 'Person']: {
              _id: '786-PER-000',
              license: '786-TSJ-000',
            },
            [modelName + 'Droid']: {
              _id: '786-DRD-000',
              make: {
                type: FieldConfigTypes.String,
                nextId: '18Y4433',
                separator: 'Y',
              },
            },
          },
        };

        const CharacterIA = new MongooseIdAssigner(characterSchema, options);
        const characterModel = mongoose.model(modelName, characterSchema);

        personSchema.path('_id', String);
        const personModel = characterModel.discriminator(
          modelName + 'Person',
          personSchema,
        );

        droidSchema.path('_id', String);
        const droidModel = characterModel.discriminator(
          modelName + 'Droid',
          droidSchema,
        );

        try {
          const character = await characterModel.create({
            friends: 'placeholder',
          });
          const person = await personModel.create({ friends: 'placeholder' });
          const droid = await droidModel.create({ friends: 'placeholder' });

          expect((character as any)._id).toBe('786-DEF-000');

          expect((person as any)._id).toBe('786-PER-000');
          expect(await CharacterIA.getNextId('_id')).toBe('786-DEF-001');

          expect((droid as any)._id).toMatch('786-DRD-000');
          expect(await CharacterIA.getNextId('_id')).toBe('786-DEF-001');

          const character1 = await characterModel.create({
            friends: 'placeholder',
          });
          const person1 = await personModel.create({ friends: 'placeholder' });
          const droid1 = await droidModel.create({ friends: 'placeholder' });

          expect((character1 as any)._id).toBe('786-DEF-001');

          expect((person1 as any)._id).toBe('786-PER-001');
          expect(await CharacterIA.getNextId('_id')).toBe('786-DEF-002');

          expect((droid1 as any)._id).toBe('786-DRD-001');
          expect(await CharacterIA.getNextId('_id')).toBe('786-DEF-002');
        } catch (e) {
          expect(e).toBeUndefined();
        }
      });
    });
  });
});

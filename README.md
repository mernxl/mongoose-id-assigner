# Mongoose Id Assigner (IA)
[![npm](https://img.shields.io/npm/v/mongoose-id-assigner.svg)](https://www.npmjs.com/package/mongoose-id-assigner)
[![Build Status](https://travis-ci.org/mernxl/mongoose-id-assigner.svg?branch=master)](https://travis-ci.org/mernxl/mongoose-id-assigner)
[![codecov](https://codecov.io/gh/mernxl/mongoose-id-assigner/branch/master/graph/badge.svg)](https://codecov.io/gh/mernxl/mongoose-id-assigner)
![Dependencies State](https://david-dm.org/mernxl/mongoose-id-assigner.svg)
![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg)
![FlowType compatible](https://img.shields.io/badge/flowtype-compatible-brightgreen.svg)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A [Mongoose](http://mongoosejs.com) Plugin. Easily Manage fields that need an id(unique value) on your mongoose model. This plugin does the work of generating, incrementing, and assigning those values(unique) to those fields.

This plugin assigns values base on your configurations, be it `MongoDB's ObjectId`, `UUID`, `Number Increments`, `String Generators` or you provide your custom `nextIdFunction`.

It creates a collection with name `id_assigner` that store the `nextId` for a configured field. This only happens if you have fields configured with type `String` or `Number`. As `ObjectId` and `UUID` can be generated locally unique, they do not use this collection for assigning values.

This is the perfect tool if you wish to work with `discriminators` and have `_id` field(and/or other fields) values different amongst the discriminators instances. See examples below for demonstration.

-----

# Table of Content
- [Installation](#installation)
- [Basic Usage](#basic-usage)
  - [Plugin Options](#plugin-options)
  - [Point to Note](#point-to-note)
- [Examples](#examples)
  - [Configuration Methods](#configuration-methods)
- [Working with Discriminators](#working-with-discriminators)
- [TypeDefinitions](#typedefinitions)
- [Strain Test](#strain-test,-performs-the-task-below-on-a-locally-hosted-db-instance.)
- [Contributions](#contributions)
  - [NextIdFunctions](#nextidfunctions-(incrementer))
- [License](#license)

## Installation
```
yarn add mongoose-id-assigner
or
npm install mongoose-id-assigner
```

If you wish to use `UUIDs` FieldTypes, then you need to add this package, [uuid](https://github.com/kelektiv/node-uuid).
```
yarn add uuid
```

## Basic Usage
### Plugin Options
TypeName: **AssignerOptions**
- `modelName`: **String** Name of the Model your are working with. If discriminators, then provide baseModel Name.
- `fields`: **AssignerFieldsConfigMap?** The configuration Map of the fields you want the assigner to assign ids to.
  If undefined, then plugin assigns ids to `_id` field, (ObjectId).
  - [fieldName: string]: FieldConfig | string | number | boolean | 'GUID' | 'UUID'
- `discriminators`: **[discriminatorName: string]: AssignerFieldsConfigMap?** An Object with Keys `discriminatorName` 
  and value a Configuration Map for fields on that discriminator that need unique values. Any discriminator without a 
  fieldConfig will use that of the baseModel. 

### Point to Note
At every Network Assigner init(i.e Assigner with Number, String FieldConfigTypes), the Assigner(for a Model) refreshes and syncs with the db stored options. Take example micro-service cluster, 
the last app to init always gives most recent field configs, if the db have a field that is not in the most recent field config, it is auto dropped.
Therefore always make sure all your micro-service clusters start up with same fieldsConfigs as the last to start rewrites the db and only keeps nextIds.

## Examples
Lets create our Mongoose Schema.
```js
// schema.js  We would be reusing this schema for brevity (clone)
import * as mongoose from 'mongoose';

const ExampleSchema = new mongoose.Schema({
  _id: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
  uuidFieldString: String,
  uuidFieldBuffer: Buffer,
  objectIdField: mongoose.Schema.Types.ObjectId,
});
```

### Configuration methods
**Method 1**: Quick Config, Intended for usage with `schema.plugin(...)`. It initialises only when the first document is about to be saved.

Options Type: `AssignerPluginOptions`.
```js
const options: AssignerPluginOptions  = {
  modelName: 'ExampleModel',
  fields: {  // if no _id field config, assigner auto adds _id field with type = "ObjectId"
    uuidFieldString: 'UUID',
  }
};

ExampleSchema.plugin(MongooseIdAssigner.plugin, options);

// Saving the first doc triggers the IdAssigner initialisation for this model.
const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

const doc = await ExampleModel.create({name: 'Mernxl'});

console.log(doc._id)   --->   '5b57a1d929239e59b4e3d7f3'     // schema field type is String
console.log(doc.uuidFieldString)   --->   '7729e2e0-8f8b-11e8-882d-2dade78bb893'
```

**Method 2**: Using the `MongooseIdAssigner` constructor, it takes in the `Model` instance as first parameter, then options as second, returning IdAssigner Instance. 
You can now use the IdAssigner instance to request `nextId`s for particular fields.

Options Type: `AssignerOptions`. 
```typescript
const options: AssignerOptions = {
  fields: {
    _id: {
      type: FieldConfigTypes.String,
      separator: 'T',
      nextId: '34T5565',
    },
    uuidFieldBuffer: {
      type: FieldConfigTypes.UUID,
      version: 4,
      asBinary: true,
      versionOptions: {
        rng: (Function) Random # generator function that returns an Array[16] of byte values (0-255) // UUID doc
      }
    }
  },
};

const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

const ExampleIA = new MongooseIdAssigner(ExampleModel, options);

const doc1 = await ExampleModel.create({name: 'Mongoose'});
    
console.log(doc1._id);   --->   '34T5565'
console.log(doc1.uuidFieldBuffer);   --->  Binary { _bsontype: 'Binary', sub_type: 4, position: 36, buffer: B... }

// it getOnly, does not write off in db
// TODO: Implement hold nextId with timeout
console.log((await ExampleIA.getNextId('_id')))   --->   '34T5566'

const doc2 = await ExampleModel.create({name: 'IdAssigner'});
    
console.log(doc2._id);   --->   '34T5566'
console.log(doc2.uuidFieldBuffer);   --->   Binary { _bsontype: 'Binary', sub_type: 4, position: 36, buffer: B... }
```

## Working with Discriminators
You may have a discriminator Instance and want to have different id Types, or fields on one discriminator need to be autogenerated uniquely, here is an example;
```typescript
const CharacterSchema = new mongoose.Schema({
  _id: String,

  kind: String,
  someId: Number,
  friends: [String],
}, {
    discriminatorKey: 'kind',
});

const PersonSchema = new mongoose.Schema({
  license: String,
});

const DroidSchema = new mongoose.Schema({
  make: String,
});

const options: AssignerOptions = {
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
    },
  },
};

const characterModel = mongoose.model('example10', characterSchema);
const CharacterIA = new MongooseIdAssigner(characterModel, options);

const personModel = characterModel.discriminator('Person', personSchema);
const droidModel = characterModel.discriminator('Droid', droidSchema);


const character = await characterModel.create({ friends: 'placeholder' });
const person = await personModel.create({ friends: 'placeholder' });
const droid = await droidModel.create({ friends: 'placeholder' });
const person1 = await personModel.create({ friends: 'placeholder' });
const droid1 = await droidModel.create({ friends: 'placeholder' });

console.log(character._id)   --->   '5b59d98617e2edc57ede52b8'
console.log(character.someId)   --->   4444
console.log((await CharacterIA.getNextId('someId')))  --->   4445

console.log(person._id)   --->   '5b59d98617e2edc57ede52ba'
console.log(person.someId)   --->   4445
console.log(person.license)   --->   '786-TSJ-000'

console.log(droid._id)   --->   '48db52c0-90df-11e8-b43b-ffe3d317727b'
console.log(droid.someId)   --->   4446
console.log(droid.make)   --->   '18Y4433'
console.log((await CharacterIA.getNextId('make', 'Droid')))  --->   '18Y4434'
             
console.log(person._id)   --->   '5b59d98617e2edc57ede52bb'
console.log(person1.someId)   --->   4447
console.log(person1.license)   --->   '786-TSJ-001'
console.log((await CharacterIA.getNextId('license', 'Person')))  --->   '786-TSJ-002'       
          
console.log(droid1._id)   --->   'eb185fb0-90df-11e8-800d-dff50a2d22a3'          
console.log(droid1.someId)   --->   4448
console.log(droid1.make)   --->   '18Y4434'
```

## NextId `WIP`
It may arise that you need to query and use the nextId to at the front-end. In this case, you just need to 
get an instance of the Assigner, then use the `getNextId` method. It is async method as it queries for `Number` and `String` cases.

## TypeDefinitions
```typescript
/**
 * If Options does not contain fields(AssignerFieldsConfigMap),
 * Then setup assigner for _id field, does not use network
 */
export interface AssignerOptions {
  fields?: AssignerFieldsConfigMap;
  discriminators?: DiscriminatorConfigMap;
}

export interface AssignerPluginOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
  discriminators?: DiscriminatorConfigMap;
}

/**
 * fieldOption = string, then nextId = string, default incrementer,
 * fieldOption = number, then nextId = number, incrementBy = 1
 * fieldOption = boolean(true), then fieldType = ObjectId
 * fieldOption = GUID | UUID, then use UUID v4
 */
interface AssignerFieldsConfigMap {
  [fieldName: string]: FieldConfig | string | number | boolean | 'GUID' | 'UUID';
}

/**
 * A map of discriminatorName(modelName) and its own AssignerFieldsConfigMap
 */
export interface DiscriminatorConfigMap {
  [discriminatorName: string]: AssignerFieldsConfigMap;
}

// noSpace, insure we consume all possible values, i.e. we must have 1, 2, 3, 4
// order doesn't matter but all those keys must be present, no 1, 3, 4, 6
type FieldConfig = {
  index?: boolean;
  unique?: boolean;
  noSpace?: boolean;
} & ( DefaultFieldConfig | StringFieldConfig | NumberFieldConfig | UUIDFieldConfig );

enum FieldConfigTypes {
  UUID = 'UUID',
  GUID = 'GUID',
  String = 'String',
  Number = 'Number',
  ObjectId = 'ObjectId',
}

interface DefaultFieldConfig {
  type: 'ObjectId';
}

interface StringFieldConfig {
  type: 'String';
  nextId: string;  // the id that will be assigned next
  separator?: string;   // default `-` e.g. 434-344
  nextIdFunction?: (nextId: string) => string;  // custom function to generate nextIds
}

interface NumberFieldConfig {
  type: 'Number';
  nextId: number;
  incrementBy?: number;
  nextIdFunction?: (nextId: number, incrementBy?: number) => number;  // custom function to generate nextIds
}

interface UUIDFieldConfig {
  type: 'UUID' | 'GUID';
  asBinary?: boolean; // default string, if true, saves as Binary
  version?: 1 | 4; // supports 1 and 4, default 1
  versionOptions?: any;
}
```

### Strain test, Performs the task below on a locally hosted db instance.
```typescript
// using ts :)
import * as mongoose from 'mongoose';
import { AssignerOptions, FieldConfigTypes, localStateStore, MongooseIdAssigner } from './src';

describe('MongooseIdAssigner', () => {

  it('should be robust enough to avoid duplicates', async () => {
    const options: AssignerOptions = {
      fields: {
        _id: '33333',
        photoId: 44444,
        emailId: '55555',
        personId: {
          type: FieldConfigTypes.String,
          nextId: 'SPEC-7382-4344-3232',
          separator: '-',
        },
        uuidFieldString: FieldConfigTypes.UUID,
        uuidFieldBuffer: {
          type: FieldConfigTypes.UUID,
          version: 1,
          asBinary: true,
        },
        objectIdField: FieldConfigTypes.ObjectId,
      },
    };

    try {
      const exampleModel = mongoose.model('TestModel', exampleSchema);
      
      const ExampleIA = new MongooseIdAssigner(exampleModel, options);
      expect(ExampleIA.readyState).toBe(2); // initialising

      // initialise to ensure that
      // model is set and db is connected
      // before performing heavy tasks
      // or you can set max event listeners to 100 to suppress warnings on waits
      await ExampleIA.initialise();

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
        expect(objectIdField).toBeInstanceOf(mongoose.Types.ObjectId);
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
```

## CONTRIBUTIONS
If you find a bug, do well to create an [issue](https://github.com/mernxl/mongoose-id-assigner/issues) so we fix things up in a flash.
Have an awesome new feature to add to library, feel free to open a [PR](https://github.com/mernxl/mongoose-id-assigner/pulls)

### NextIdFunctions (Incrementer)
If you have a superb nextIdFunction, and you wish it can be added to the list of nextIdFunctions, feel free to drop a 
pull request and submit your function. 

## LICENSE
[MIT](https://github.com/mernxl/mongoose-id-assigner/blob/master/LICENSE.md) 

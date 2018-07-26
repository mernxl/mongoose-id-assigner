# Mongoose Id Assigner (IA)
[![npm](https://img.shields.io/npm/v/mongoose-id-assigner.svg)](https://www.npmjs.com/package/mongoose-id-assigner)
[![Build Status](https://travis-ci.org/mernxl/mongoose-id-assigner.svg?branch=master)](https://travis-ci.org/mernxl/mongoose-id-assigner)
[![codecov](https://codecov.io/gh/mernxl/mongoose-id-assigner/branch/master/graph/badge.svg)](https://codecov.io/gh/mernxl/mongoose-id-assigner)
![TypeScript compatible](https://img.shields.io/badge/typescript-compatible-brightgreen.svg)
![FlowType compatible](https://img.shields.io/badge/flowtype-compatible-brightgreen.svg)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A [Mongoose](http://mongoosejs.com) Plugin. Easily Manage fields that need an id(unique value) on your mongoose model. This plugin does the work of generating, incrementing, and assigning those values(unique) to those fields.

This plugin assigns values base on your configurations, be it `MongoDB's ObjectId`, `UUID`, `Number Increments`, `String Generators` or you provide your custom `nextIdFunction`.

It creates a collection with name `id_assigner` that store the `nextId` for a configured field. This only happens if you have fields configured with type `String` or `Number`. As `ObjectId` and `UUID` can be generated locally unique, they do not use this collection for assigning values.

## Installation
```
yarn add mongoose-id-assigner
or
npm install mongoose-id-assigner
```

## Basic Usage
### Plugin Options
TypeName: **AssignerOptions**
- `modelName`: **String** Name for the Model your are working with.
- `fields`: **AssignerFieldsConfigMap?** The configuration Map of the fields you want the assigner to assign ids to.
  If Null, then plugin assigns ids to `_id` field, (ObjectId).
  - [fieldName: string]: FieldConfig | string | number | boolean | 'GUID' | 'UUID'

## Examples
Lets create our Mongoose Schema.
```js
// schema.js  We would be reusing this schema for brevity (clone)
import * as mongoose from 'mongoose';

const ExampleSchema = new mongoose.Schema({
  _id: String,
  name: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
  uuidFieldString: String,
  uuidFieldBuffer: Buffer,
  objectIdField: mongoose.Schema.Types.ObjectId,
});
```

Configure the Plugin on Schema you want to work with. You need at least the modelName passed as AssignerOption.
### Configuration methods
**Method 1**: Quick Config, Good if your ids need no network use, case `ObjectId`, `UUID`. It carries out a lazy Initialisation of Model
```js
const options = {
  modelName: 'ExampleModel',
  fields: {
    // if no _id field config, assigner auto adds _id field with type = "ObjectId"
    uuidFieldString: 'UUID',
  }
};

ExampleSchema.plugin(MongooseIdAssigner.plugin, options);

// No need to initialise if you don't intent to start saving files immediately
// Saving the first doc triggers the plugin Assigner initialisation for this model.
const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

const doc = await ExampleModel.create({name: 'Mernxl'})

console.log(doc._id)   --->   '5b57a1d929239e59b4e3d7f3'     // schema field type is String
console.log(doc.uuidFieldString)   --->   '7729e2e0-8f8b-11e8-882d-2dade78bb893'
```

**Method 2**: Request Assigner Instance, If you have initialisation logic, you need to initialise the plugin.
```js
const options = {
  modelName: 'ExampleModel',
  fields: {
    photoId: {
      type: FieldConfigTypes.Number,
      nextId: 0000,
      incrementBy: 4,
      nextIdFunction: (nextId, incrementBy) => nextId + incrementBy,
    }
  }
};

// If you have startup logic that needs to save files, request instance then initialise
const ExampleIA = MongooseIdAssigner.plugin(ExampleSchema, options);

const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

// returns a promise...
ExampleIA.initialise(ExampleModel)
  .then((readyCode) => {
    const doc1 = await ExampleModel.create({name: 'Mongoose'});
    
    console.log(doc1._id)   --->   '5b57a1d929239e59b4e3d7f3'
    console.log(doc1.photoId)   --->   0000
    
    const doc2 = await ExampleModel.create({name: 'IdAssigner'});
    
    console.log(doc1._id)   --->   '5b57a3612000c406eceaefc2'
    console.log(doc1.photoId)   --->   0004
  })
  .catch((error) => /* ... Error at initialisation process, do error stuff */)
```

**Method 3**: Request Assigner Instance, This method also returns IdAssigner instance.
```js
const options = {
  modelName: 'ExampleModel',
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

// If you have startup logic that needs to save files, request instance then initialise
const ExampleIA = new MongooseIdAssigner(ExampleSchema, options); // <- diff

const ExampleModel = mongoose.model('ExampleModel', ExampleSchema);

// returns a promise...
ExampleIA.initialise(ExampleModel)
  .then((readyCode) => {
    const doc1 = await ExampleModel.create({name: 'Mongoose'});
    
    console.log(doc1._id)   --->   '34T5565'
    console.log(doc1.uuidFieldBuffer)   --->  Binary { _bsontype: 'Binary', sub_type: 4, position: 36, buffer: B... }
    
    const doc2 = await ExampleModel.create({name: 'IdAssigner'});
    
    console.log(doc1._id)   --->   '34T5566'
    console.log(doc1.uuidFieldBuffer)   --->   Binary { _bsontype: 'Binary', sub_type: 4, position: 36, buffer: B... }
  })
  .catch((error) => /* ... do error stuff */)
```

### TypeDefinitions
```typescript
/**
 * If Option does not contain an AssignerFieldsConfigMap, then we use the config options for _id
 */
interface AssignerOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
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
  separator?: string;
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
  version?: number; // supports 1 and 4, default 1
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
      modelName: 'example6',
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
      const plugin = MongooseIdAssigner.plugin(exampleSchema, options);

      const exampleModel = mongoose.model('example6', exampleSchema);

      // initialise to ensure that
      // model is set and db is connected
      // before performing heavy tasks
      await plugin.initialise(exampleModel);

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

## LICENSE
[MIT](https://github.com/mernxl/mongoose-id-assigner/blob/master/LICENSE.md)

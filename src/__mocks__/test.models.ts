import { Schema } from 'mongoose';

const ExampleSchema = new Schema({
  _id: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
  uuidFieldString: String,
  uuidFieldBuffer: Buffer,
  objectIdField: Schema.Types.ObjectId,
});

const CharacterSchema = new Schema(
  {
    _id: String,

    kind: String,
  },
  {
    discriminatorKey: 'kind',
  },
);

const DroidSchema = new Schema({
  model: String,
});

export function getSchema(index: number) {
  const schema = [ExampleSchema, CharacterSchema, DroidSchema];

  return schema[index].clone();
}

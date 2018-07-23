import { createConnection, Schema } from 'mongoose';

const CharacterSchema = new Schema(
  {
    _id: String,

    kind: String,
  },
  {
    discriminatorKey: 'kind',
  },
);

const PersonSchema = new Schema({
  _id: String,

  photoId: Number,
  emailId: String,
  personId: String,
  uuidField: Buffer,
});

const DroidSchema = new Schema({
  model: String,
});

export const demoDB = createConnection('mongodb://localhost:27017/demoDB', {
  useNewUrlParser: true,
});

export function getSchema(index: number) {
  const schema = [CharacterSchema, PersonSchema, DroidSchema];

  return schema[index].clone();
}

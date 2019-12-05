import { MongoMemoryServer } from 'mongodb-memory-server-global';
import { ConnectionOptions } from 'mongoose';
import * as mongoose from 'mongoose';

const mongooseOptions: ConnectionOptions = {
  promiseLibrary: Promise,
  autoReconnect: true,
  reconnectTries: Number.MAX_VALUE,
  reconnectInterval: 1000,
  useNewUrlParser: true,
};

const IN_MEM = !!process.env.IN_MEM;

let init = false;

export function getMongoose() {
  if (init) {
    return mongoose;
  }

  init = true;

  if (IN_MEM) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    const mongoServer = new MongoMemoryServer();

    mongoServer.getConnectionString().then(async mongoUri => {
      mongoose.connection.on('error', e => {
        if (e.message.code === 'ETIMEDOUT') {
          console.error(e);
        } else {
          throw e;
        }
      });

      mongoose.connection.once('open', () => {
        console.log(`MongoDB successfully connected to ${mongoUri}`);
      });

      mongoose.connection.once('disconnected', () => mongoServer.stop());

      await mongoose.connect(
        mongoUri,
        mongooseOptions,
      );
    });

    return mongoose;
  } else {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    mongoose.connect(
      'mongodb://localhost:27017/__mgIdAss__',
      mongooseOptions,
    );

    mongoose.connection.once('open', () => {
      console.log(`MongoDB successfully connected local`);
    });

    return mongoose;
  }
}

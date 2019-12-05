export function waitPromise(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function PluginError(message: string, modelName?: string, field?: string) {
  return new Error(
    `[MongooseIdAssigner], ${modelName ? 'Model: ' + modelName + ', ' : ''}${
      field ? 'Field: ' + field + ', ' : ''
    }${message}`,
  );
}

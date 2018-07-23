export function waitPromise(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function throwPluginError(
  message: string,
  modelName?: string,
  field?: string,
) {
  throw new Error(
    `[MongooseIdAssigner], ${modelName ? 'Model: ' + modelName + ', ' : ''}${
      field ? 'Field: ' + field + ', ' : ''
    }${message}`,
  );
}

import {
  DefaultOptions,
  FieldTypes,
  IdOptions,
  NumberOptions,
  StringOptions,
  UUIDOptions,
} from '../assigner.interfaces';

/*export function isDiscriminator(
 options: IAssignIdPluginOptions | IAssignIdPluginDOptions,
 ): options is IAssignIdPluginDOptions {
 return !!(options as IAssignIdPluginDOptions).discriminatorKey;
 }*/

export function isObjectId(
  options: IdOptions | string | number | boolean | 'GUID' | 'UUID',
): options is DefaultOptions {
  return (options as IdOptions).type === FieldTypes.ObjectId;
}

export function isString(
  options: IdOptions | string | number | boolean | 'GUID' | 'UUID',
): options is StringOptions {
  return (options as IdOptions).type === FieldTypes.String;
}

export function isNumber(
  options: IdOptions | string | number | boolean | 'GUID' | 'UUID',
): options is NumberOptions {
  return (options as IdOptions).type === FieldTypes.Number;
}

export function isUUID(
  options: IdOptions | string | number | boolean | 'GUID' | 'UUID',
): options is UUIDOptions {
  return (
    (options as IdOptions).type === FieldTypes.UUID ||
    (options as IdOptions).type === FieldTypes.GUID
  );
}

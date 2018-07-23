import {
  DefaultFieldConfig,
  FieldConfig,
  FieldConfigTypes,
  NumberFieldConfig,
  StringFieldConfig,
  UUIDFieldConfig,
} from '../assigner.interfaces';

/*export function isDiscriminator(
 options: IAssignIdPluginOptions | IAssignIdPluginDOptions,
 ): options is IAssignIdPluginDOptions {
 return !!(options as IAssignIdPluginDOptions).discriminatorKey;
 }*/

export function isObjectId(
  options: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): options is DefaultFieldConfig {
  return (options as FieldConfig).type === FieldConfigTypes.ObjectId;
}

export function isString(
  options: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): options is StringFieldConfig {
  return (options as FieldConfig).type === FieldConfigTypes.String;
}

export function isNumber(
  options: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): options is NumberFieldConfig {
  return (options as FieldConfig).type === FieldConfigTypes.Number;
}

export function isUUID(
  options: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): options is UUIDFieldConfig {
  return (
    (options as FieldConfig).type === FieldConfigTypes.UUID ||
    (options as FieldConfig).type === FieldConfigTypes.GUID
  );
}

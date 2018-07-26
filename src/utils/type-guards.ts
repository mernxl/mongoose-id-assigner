import {
  DefaultFieldConfig,
  FieldConfig,
  FieldConfigTypes,
  NumberFieldConfig,
  StringFieldConfig,
  UUIDFieldConfig,
} from '../assigner.interfaces';

export function isObjectId(
  config: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): config is DefaultFieldConfig {
  return (config as FieldConfig).type === FieldConfigTypes.ObjectId;
}

export function isString(
  config: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): config is StringFieldConfig {
  return (config as FieldConfig).type === FieldConfigTypes.String;
}

export function isNumber(
  config: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): config is NumberFieldConfig {
  return (config as FieldConfig).type === FieldConfigTypes.Number;
}

export function isUUID(
  config: FieldConfig | string | number | boolean | 'GUID' | 'UUID',
): config is UUIDFieldConfig {
  return (
    (config as FieldConfig).type === FieldConfigTypes.UUID ||
    (config as FieldConfig).type === FieldConfigTypes.GUID
  );
}

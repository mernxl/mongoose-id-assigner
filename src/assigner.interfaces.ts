export enum FieldConfigTypes {
  UUID = 'UUID',
  GUID = 'GUID',
  String = 'String',
  Number = 'Number',
  ObjectId = 'ObjectId',
}

export interface DefaultFieldConfig {
  type: 'ObjectId';
}

export interface StringFieldConfig {
  type: 'String';
  nextId: string;
  separator?: string;
  incFn?: (nextId: string) => string;
}

export interface NumberFieldConfig {
  type: 'Number';
  nextId: number;
  incrementBy?: number;
  incFn?: (nextId: number, incrementBy?: number) => number;
}

export interface UUIDFieldConfig {
  type: 'UUID' | 'GUID';
  version: number; // supports 1 and 4
  versionOptions?: any;
}

// noSpace, insure we consume all possible values, i.e. we must have 1, 2, 3, 4
// order doesn't matter but all those keys must be present, no 1, 3, 4, 6
export type FieldConfig = {
  index?: boolean;
  unique?: boolean;
  noSpace?: boolean;
} & (
  | DefaultFieldConfig
  | StringFieldConfig
  | NumberFieldConfig
  | UUIDFieldConfig);

/**
 * fieldOption = string, then nextId = string, default incrementer,
 * fieldOption = number, then nextId = number, incrementBy = 1
 * fieldOption = boolean(true), then fieldType = ObjectId
 * fieldOption = GUID | UUID, then use UUID v4
 */
export interface AssignerFieldsConfigMap {
  [fieldName: string]:
    | FieldConfig
    | string
    | number
    | boolean
    | 'GUID'
    | 'UUID';
}

/**
 * If Option does not contain an AssignerFieldsConfigMap, then we use the config options for _id
 */
export interface AssignerOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
}

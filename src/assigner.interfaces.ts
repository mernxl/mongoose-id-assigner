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
  asBinary?: boolean; // default string
  version?: number; // supports 1 and 4, default 1
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
 * fieldConfig = string, then nextId = string, default incrementer,
 * fieldConfig = number, then nextId = number, incrementBy = 1
 * fieldConfig = boolean(true), then fieldType = ObjectId
 * fieldConfig = GUID | UUID, then use UUID v4
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
 * If Options does not contain fields(AssignerFieldsConfigMap),
 * Then setup assigner for _id field, does not use network
 */
export interface AssignerOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
}

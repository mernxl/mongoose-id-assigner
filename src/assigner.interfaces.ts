export enum FieldConfigTypes {
  UUID = 'UUID',
  GUID = 'GUID',
  String = 'String',
  Number = 'Number',
  ObjectId = 'ObjectId',
}

export interface DefaultFieldConfig {
  type: FieldConfigTypes.ObjectId;
}

export interface StringFieldConfig {
  type: FieldConfigTypes.String;
  nextId: string;
  separator?: string;
  nextIdFunction?: (nextId: string) => string;
}

export interface NumberFieldConfig {
  type: FieldConfigTypes.Number;
  nextId: number;
  incrementBy?: number;
  nextIdFunction?: (nextId: number, incrementBy?: number) => number;
}

export interface UUIDFieldConfig {
  type: FieldConfigTypes.UUID | FieldConfigTypes.GUID;
  asBinary?: boolean; // default string
  version?: 1 | 4; // supports 1 and 4, default 1
  versionOptions?: any;
}

/**
 *
 * @property {Boolean} noSpace - noSpace, insure we consume all possible values, i.e. we
 * must have 1, 2, 3, 4 order doesn't matter but all those keys must be present, no 1, 3, 4, 6.
 * If noSpace is true, then on holdTimeout, that nextId will be use on any newly
 * saving doc, else nextId discarded
 *
 * @property {Number} maxHold[50] - As there may be performance issues when holding ids, maxHold
 * will be set,
 * @property {String} holdTimeout - default timeout string, must be parse-able to number
 * by `ms` plugin
 * @property {Number} holdTimeout - default timeout millis, gotten id stays onHold for
 * this length of time
 * @property {Boolean} holdTimeout - if true, will always getNextId with default
 * timeout of `1 week` else use getOnly on getNextIds
 */
export type FieldConfig = {
  index?: boolean;
  unique?: boolean;
  noSpace?: boolean;
} & (DefaultFieldConfig | StringFieldConfig | NumberFieldConfig | UUIDFieldConfig);

/**
 * fieldConfig = string, then nextId = string, default incrementer,
 * fieldConfig = number, then nextId = number, incrementBy = 1
 * fieldConfig = boolean(true), then fieldType = ObjectId
 * fieldConfig = GUID | UUID, then use UUID v1
 */
export interface AssignerFieldsConfigMap {
  [fieldName: string]:
    | FieldConfig
    | string
    | number
    | boolean
    | FieldConfigTypes.GUID
    | FieldConfigTypes.UUID;
}

/**
 * A map of discriminatorName(modelName) and its own AssignerFieldsConfigMap
 */
export interface DiscriminatorConfigMap {
  [discriminatorName: string]: AssignerFieldsConfigMap;
}

/**
 * If Options does not contain fields(AssignerFieldsConfigMap),
 * Then setup assigner for _id field, does not use network
 */
export interface AssignerOptions {
  fields?: AssignerFieldsConfigMap;
  discriminators?: DiscriminatorConfigMap;
}

export interface AssignerPluginOptions {
  modelName: string;
  fields?: AssignerFieldsConfigMap;
  discriminators?: DiscriminatorConfigMap;
}

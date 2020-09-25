import { Binary } from 'mongodb';
import { UUIDFieldConfig } from '../../assigner.interfaces';

export function getNextIdUUID(fieldConfig: UUIDFieldConfig) {
  const uuidImport = require('uuid');

  const uuid = fieldConfig.version === 4 ? uuidImport.v4 : uuidImport.v1;

  const UUID = uuid(fieldConfig.versionOptions);

  return fieldConfig.asBinary ? new Binary(UUID, Binary.SUBTYPE_UUID) : UUID;
}

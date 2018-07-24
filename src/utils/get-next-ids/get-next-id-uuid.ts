import { Binary } from 'mongodb';
import { UUIDFieldConfig } from '../../assigner.interfaces';

export function getNextIdUUID(fieldConfig: UUIDFieldConfig) {
  const uuid =
    fieldConfig.version === 4 ? require('uuid/v4') : require('uuid/v1');

  const UUID = uuid(fieldConfig.versionOptions);

  return fieldConfig.asBinary ? new Binary(UUID, Binary.SUBTYPE_UUID) : UUID;
}

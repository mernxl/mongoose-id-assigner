import { Binary } from 'mongodb';
import { UUIDFieldConfig } from '../../assigner.interfaces';

export function getNextIdUUID(options: UUIDFieldConfig) {
  const uuid = options.version === 1 ? require('uuid/v1') : require('uuid/v4');

  const UUID = uuid(options.versionOptions);

  return new Binary(UUID, Binary.SUBTYPE_UUID);
}

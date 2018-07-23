import { Binary } from 'mongodb';
import { UUIDFieldConfig } from '../../assigner.interfaces';

export function getNextIdUUID(options: UUIDFieldConfig) {
  const uuid = options.version === 4 ? require('uuid/v4') : require('uuid/v1');

  const UUID = uuid(options.versionOptions);

  return options.asBinary ? new Binary(UUID, Binary.SUBTYPE_UUID) : UUID;
}

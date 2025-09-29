export const FIRMWARE_CONFIG = {
  '194kw': ['fw194_v1.0.0.zip', 'fw194_v1.1.0.zip'],
  '300kw': ['fw300_v2.0.0.zip'],
  '360kw': ['fw360_v3.2.1.zip']
} as const;

export type FirmwareOption = keyof typeof FIRMWARE_CONFIG;

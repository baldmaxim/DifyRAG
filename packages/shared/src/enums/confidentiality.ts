export const Confidentiality = {
  Public: 'public',
  Internal: 'internal',
  Confidential: 'confidential',
  Restricted: 'restricted',
} as const;

export type Confidentiality = (typeof Confidentiality)[keyof typeof Confidentiality];

export const CONFIDENTIALITY_VALUES = Object.values(Confidentiality) as Confidentiality[];

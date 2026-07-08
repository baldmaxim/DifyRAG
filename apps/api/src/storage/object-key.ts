import { safeFileName } from './file-validation';

export interface BuildObjectKeyParams {
  scope: string;
  projectCode?: string | null;
  documentId: string;
  versionNo: number;
  fileName: string;
  date?: Date;
}

/**
 * Object key layout:
 *   documents/{scope}/{projectCodeOrGlobal}/{yyyy}/{mm}/{documentId}/{versionNo}/{safeFileName}
 */
export function buildObjectKey(params: BuildObjectKeyParams): string {
  const date = params.date ?? new Date();
  const yyyy = date.getUTCFullYear().toString();
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const projectSegment = params.projectCode && params.projectCode.length > 0
    ? params.projectCode
    : 'global';
  return [
    'documents',
    params.scope,
    projectSegment,
    yyyy,
    mm,
    params.documentId,
    params.versionNo.toString(),
    safeFileName(params.fileName),
  ].join('/');
}

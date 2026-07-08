/**
 * Maps project folder paths to Dify dataset groups (strategy `project_section`).
 * Nested folders inherit their top-level section.
 */
export const DifyFolderGroup = {
  ProjectCard: 'project_card',
  Contracts: 'contracts',
  Correspondence: 'correspondence',
  Tender: 'tender',
  DesignDocs: 'design_docs',
  WorkingDocs: 'working_docs',
  Estimates: 'estimates',
  Finance: 'finance',
  Schedule: 'schedule',
  ClaimsRisks: 'claims_risks',
  Meetings: 'meetings',
  CourtsLitigation: 'courts_litigation',
  Warranty: 'warranty',
  MaterialsOnSite: 'materials_on_site',
  AdditionalWorks: 'additional_works',
  PhotoVideo: 'photo_video',
  Archive: 'archive',
} as const;

export type DifyFolderGroup = (typeof DifyFolderGroup)[keyof typeof DifyFolderGroup];

/** All project section groups, in canonical order (one Dify dataset each). */
export const PROJECT_SECTIONS: DifyFolderGroup[] = Object.values(DifyFolderGroup);

const TOP_LEVEL_TO_GROUP: Record<string, DifyFolderGroup> = {
  '00-project-card': DifyFolderGroup.ProjectCard,
  '01-contracts': DifyFolderGroup.Contracts,
  '02-correspondence': DifyFolderGroup.Correspondence,
  '03-tender': DifyFolderGroup.Tender,
  '04-design-docs': DifyFolderGroup.DesignDocs,
  '05-working-docs': DifyFolderGroup.WorkingDocs,
  '06-estimates': DifyFolderGroup.Estimates,
  '07-finance': DifyFolderGroup.Finance,
  '08-schedule': DifyFolderGroup.Schedule,
  '09-claims-risks': DifyFolderGroup.ClaimsRisks,
  '10-meetings': DifyFolderGroup.Meetings,
  '11-courts-litigation': DifyFolderGroup.CourtsLitigation,
  '12-warranty': DifyFolderGroup.Warranty,
  '13-materials-on-site': DifyFolderGroup.MaterialsOnSite,
  '14-additional-works': DifyFolderGroup.AdditionalWorks,
  '15-photo-video': DifyFolderGroup.PhotoVideo,
  '98-old-versions': DifyFolderGroup.Archive,
  '99-archive': DifyFolderGroup.Archive,
};

/**
 * Resolve a folder path to its Dify folder group. Uses the top-level segment;
 * unknown segments fall back to the `archive` group (never crash the pipeline).
 */
export function resolveDifyFolderGroup(folderPath: string): DifyFolderGroup {
  const topLevel = folderPath.replace(/^\/+/, '').split('/')[0] ?? '';
  return TOP_LEVEL_TO_GROUP[topLevel] ?? DifyFolderGroup.Archive;
}

/** Company-scope dataset sections. */
export const COMPANY_SECTIONS = [
  'legal',
  'commercial',
  'finance',
  'accounting',
  'production',
  'procurement',
  'pto',
  'design_review',
  'hr_public',
  'it',
  'warranty',
  'safety',
  'templates',
  'reference',
  'contractors',
  'people_public',
  'people_private',
] as const;

export type CompanySection = (typeof COMPANY_SECTIONS)[number];

export function projectDatasetName(projectCode: string, group: DifyFolderGroup): string {
  return `project_${projectCode}__${group}`;
}

export function companyDatasetName(section: CompanySection | string): string {
  return `company__${section}`;
}

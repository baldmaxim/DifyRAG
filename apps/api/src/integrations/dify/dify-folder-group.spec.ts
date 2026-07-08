import { describe, expect, it } from 'vitest';
import {
  companyDatasetName,
  projectDatasetName,
  resolveDifyFolderGroup,
  PROJECT_SECTIONS,
} from './dify-folder-group';

describe('resolveDifyFolderGroup', () => {
  it('maps top-level folders to groups', () => {
    expect(resolveDifyFolderGroup('00-project-card')).toBe('project_card');
    expect(resolveDifyFolderGroup('01-contracts')).toBe('contracts');
    expect(resolveDifyFolderGroup('07-finance')).toBe('finance');
    expect(resolveDifyFolderGroup('99-archive')).toBe('archive');
    expect(resolveDifyFolderGroup('98-old-versions')).toBe('archive');
  });

  it('lets nested folders inherit the top-level group', () => {
    expect(resolveDifyFolderGroup('07-finance/03-ks2-ks3/01-customer-ks2')).toBe('finance');
    expect(resolveDifyFolderGroup('07-finance/05-material-payment-allocation-letters')).toBe('finance');
    expect(resolveDifyFolderGroup('13-materials-on-site/02-upd')).toBe('materials_on_site');
    expect(resolveDifyFolderGroup('13-materials-on-site/03-ttn')).toBe('materials_on_site');
    expect(resolveDifyFolderGroup('05-working-docs/03-detected-remarks')).toBe('working_docs');
    expect(resolveDifyFolderGroup('11-courts-litigation/02-court-claims')).toBe('courts_litigation');
    expect(resolveDifyFolderGroup('12-warranty/01-warranty-requests')).toBe('warranty');
    expect(resolveDifyFolderGroup('14-additional-works/02-calculations')).toBe('additional_works');
  });

  it('falls back to archive for unknown folders', () => {
    expect(resolveDifyFolderGroup('zz-unknown/whatever')).toBe('archive');
  });

  it('builds dataset names', () => {
    expect(projectDatasetName('zilart-lot-31', 'finance')).toBe('project_zilart-lot-31__finance');
    expect(companyDatasetName('people_private')).toBe('company__people_private');
  });

  it('exposes 17 project sections', () => {
    expect(PROJECT_SECTIONS).toHaveLength(17);
  });
});

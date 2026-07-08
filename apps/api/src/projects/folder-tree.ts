/**
 * Standard project folder tree (see CLAUDE.md). Pure, deterministic generation
 * so it can be unit-tested independently of persistence.
 */
export interface FolderTreeNode {
  segment: string;
  children?: FolderTreeNode[];
}

export interface FlatFolder {
  segment: string;
  name: string;
  slug: string;
  path: string;
  parentPath: string | null;
  sortOrder: number;
  depth: number;
}

export const PROJECT_FOLDER_TREE: FolderTreeNode[] = [
  { segment: '00-project-card' },
  { segment: '01-contracts' },
  { segment: '02-correspondence' },
  { segment: '03-tender' },
  { segment: '04-design-docs' },
  {
    segment: '05-working-docs',
    children: [
      { segment: '00-registers' },
      { segment: '01-incoming-packages' },
      {
        segment: '02-by-discipline',
        children: [
          { segment: 'AR' },
          { segment: 'KR' },
          { segment: 'KZh' },
          { segment: 'KM' },
          { segment: 'OV' },
          { segment: 'VK' },
          { segment: 'EOM' },
          { segment: 'SS' },
          { segment: 'APS' },
          { segment: 'POS' },
          { segment: 'PPR' },
        ],
      },
      { segment: '03-detected-remarks' },
      { segment: '04-answers-from-designer' },
      { segment: '05-closed-remarks' },
      { segment: '98-old-versions' },
    ],
  },
  {
    segment: '06-estimates',
    children: [
      { segment: '01-contract-estimates' },
      { segment: '02-tender-estimates' },
      { segment: '03-subcontractor-estimates' },
      { segment: '04-current-budget' },
      { segment: '05-estimate-comparisons' },
    ],
  },
  {
    segment: '07-finance',
    children: [
      { segment: '01-advances-payments' },
      { segment: '02-invoices' },
      {
        segment: '03-ks2-ks3',
        children: [
          { segment: '01-customer-ks2' },
          { segment: '02-subcontractor-ks2' },
          { segment: '03-ks2-performance-register' },
        ],
      },
      { segment: '04-taxes' },
      { segment: '05-material-payment-allocation-letters' },
      { segment: '06-budget-limits' },
    ],
  },
  { segment: '08-schedule' },
  { segment: '09-claims-risks' },
  { segment: '10-meetings' },
  {
    segment: '11-courts-litigation',
    children: [
      { segment: '01-pretrial-claims' },
      { segment: '02-court-claims' },
      { segment: '03-court-materials' },
      { segment: '04-court-decisions' },
      { segment: '05-enforcement' },
    ],
  },
  {
    segment: '12-warranty',
    children: [
      { segment: '01-warranty-requests' },
      { segment: '02-inspection-reports' },
      { segment: '03-defect-lists' },
      { segment: '04-correction-evidence' },
      { segment: '05-closed-requests' },
    ],
  },
  {
    segment: '13-materials-on-site',
    children: [
      { segment: '01-material-register' },
      { segment: '02-upd' },
      { segment: '03-ttn' },
      { segment: '04-delivery-photos' },
      { segment: '05-acceptance-discrepancies' },
      { segment: '06-supplier-documents' },
    ],
  },
  {
    segment: '14-additional-works',
    children: [
      { segment: '01-requests' },
      { segment: '02-calculations' },
      { segment: '03-estimates' },
      { segment: '04-approval' },
      { segment: '05-ks2-closure' },
    ],
  },
  { segment: '15-photo-video' },
  { segment: '98-old-versions' },
  { segment: '99-archive' },
];

/** Humanize a folder segment for display (keeps short discipline codes as-is). */
export function humanizeSegment(segment: string): string {
  if (/^[A-Z]{2,4}$/.test(segment)) {
    return segment; // discipline codes: AR, KR, KZh, ...
  }
  return segment
    .replace(/^\d+-/, '')
    .split('-')
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Flatten the tree into folder records with full relative paths (parents first). */
export function flattenFolderTree(tree: FolderTreeNode[] = PROJECT_FOLDER_TREE): FlatFolder[] {
  const out: FlatFolder[] = [];

  const walk = (nodes: FolderTreeNode[], parentPath: string | null, depth: number): void => {
    nodes.forEach((node, index) => {
      const path = parentPath ? `${parentPath}/${node.segment}` : node.segment;
      out.push({
        segment: node.segment,
        name: humanizeSegment(node.segment),
        slug: node.segment.toLowerCase(),
        path,
        parentPath,
        sortOrder: index,
        depth,
      });
      if (node.children && node.children.length > 0) {
        walk(node.children, path, depth + 1);
      }
    });
  };

  walk(tree, null, 0);
  return out;
}

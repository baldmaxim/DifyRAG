/**
 * Document type codes used across projects and company sections.
 * Kept in sync with the `document_types` seed data in the backend.
 */
export const DocumentTypeCode = {
  ProjectCard: 'project_card',
  Contract: 'contract',
  AdditionalAgreement: 'additional_agreement',
  LetterIn: 'letter_in',
  LetterOut: 'letter_out',
  Tender: 'tender',
  DesignDocumentation: 'design_documentation',
  WorkingDocumentation: 'working_documentation',
  WorkingDocumentationRemark: 'working_documentation_remark',
  Estimate: 'estimate',
  Ks2: 'ks2',
  Ks3: 'ks3',
  MaterialPaymentAllocationLetter: 'material_payment_allocation_letter',
  Upd: 'upd',
  Ttn: 'ttn',
  DeliveryPhoto: 'delivery_photo',
  CourtClaim: 'court_claim',
  CourtDecision: 'court_decision',
  WarrantyRequest: 'warranty_request',
  DefectList: 'defect_list',
  AdditionalWorkCalculation: 'additional_work_calculation',
  MeetingProtocol: 'meeting_protocol',
  Schedule: 'schedule',
  Risk: 'risk',
  Photo: 'photo',
  Video: 'video',
  Template: 'template',
  DepartmentSkill: 'department_skill',
  EmployeeInfo: 'employee_info',
} as const;

export type DocumentTypeCode = (typeof DocumentTypeCode)[keyof typeof DocumentTypeCode];

export const DOCUMENT_TYPE_CODE_VALUES = Object.values(DocumentTypeCode) as DocumentTypeCode[];

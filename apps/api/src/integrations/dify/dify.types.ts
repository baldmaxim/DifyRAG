export interface DifyDataset {
  id: string;
  name: string;
  description?: string | null;
  document_count?: number;
  indexing_technique?: string | null;
}

export interface DifyListDatasetsResponse {
  data: DifyDataset[];
  has_more?: boolean;
  total?: number;
  page?: number;
  limit?: number;
}

export interface CreateDatasetParams {
  name: string;
  description?: string;
  indexing_technique?: 'high_quality' | 'economy';
  permission?: 'only_me' | 'all_team_members' | 'partial_members';
}

export interface DifyProcessRule {
  mode: 'automatic' | 'custom';
  rules?: Record<string, unknown>;
}

export interface CreateDocumentByFileData {
  indexing_technique?: 'high_quality' | 'economy';
  doc_form?: 'text_model' | 'hierarchical_model' | 'qa_model';
  doc_language?: string;
  process_rule?: DifyProcessRule;
}

export interface CreateDocumentByFileParams {
  datasetId: string;
  file: Uint8Array;
  fileName: string;
  mimeType: string;
  data: CreateDocumentByFileData;
}

export interface UpdateDocumentByFileParams extends CreateDocumentByFileParams {
  documentId: string;
}

export interface DifyDocumentRef {
  id: string;
  name?: string;
  indexing_status?: string;
}

export interface DifyCreateDocumentResponse {
  document: DifyDocumentRef;
  batch: string;
}

export interface DifyIndexingStatusItem {
  id: string;
  indexing_status: string;
  completed_segments?: number;
  total_segments?: number;
  error?: string | null;
}

export interface DifyIndexingStatusResponse {
  data: DifyIndexingStatusItem[];
}

export type DifyDocumentStatusAction = 'enable' | 'disable' | 'archive' | 'un_archive';

export interface DifyRetrieveOptions {
  top_k?: number;
  score_threshold?: number;
  score_threshold_enabled?: boolean;
  reranking_enable?: boolean;
  search_method?: 'semantic_search' | 'full_text_search' | 'hybrid_search';
}

export interface DifyRetrieveRecord {
  segment: {
    id: string;
    content: string;
    document?: { id: string; name?: string };
    document_id?: string;
  };
  score: number;
}

export interface DifyRetrieveResponse {
  query?: { content: string };
  records: DifyRetrieveRecord[];
}

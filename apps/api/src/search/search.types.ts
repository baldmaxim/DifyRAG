export interface SearchChunk {
  content: string;
  score: number;
  dataset_id: string;
  dify_document_id: string | null;
  document_id: string | null;
  document_title: string | null;
  document_type: string | null;
  project_code: string | null;
  folder_path: string | null;
  source: {
    file_name: string | null;
    document_version_id: string | null;
    page: number | null;
  };
}

export interface SearchSource {
  document_id: string;
  title: string;
  file_name: string | null;
  folder_path: string | null;
}

export interface SearchResponse {
  answer: string | null;
  chunks: SearchChunk[];
  sources: SearchSource[];
  trace_id: string;
  warnings: string[];
}

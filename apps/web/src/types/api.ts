export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface SubmitValidationPayload {
  crop_id: string;
  crop_stage: string;
  farmer_notes: string;
  policy_id: string;
  agent_id?: string;
  latitude: number;
  longitude: number;
  photo?: File;
}

export interface SubmitValidationResponse {
  request_id: string;
  tx_hash: string;
  status: string;
}

export interface GetValidationResponse {
  request: import("./database").ValidationRequest;
  result: import("./database").ValidationResult | null;
}

export interface WeatherContextPayload {
  latitude: number;
  longitude: number;
}

export interface RegisterAgentPayload {
  name: string;
  description?: string;
}

export interface ExportWalletPayload {
  password: string;
}

export interface ExportWalletResponse {
  private_key: string;
  public_address: string;
}

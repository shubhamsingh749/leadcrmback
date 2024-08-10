export interface FailureList {
  firstname: string;
  phonenumber: bigint | null;
  status: string;
  address1: string;
  comments: string;
  failure_cause: string;
}

export interface DailerResponse {
  Response: string;
  failure_list?: FailureList[];
  total: number;
  pass: number;
  fail: number;
}

export interface Approach {
  approach: string;
  steps?: Step[];
};

export interface Step {
  step: string;
  steps?: Step[];
};

export interface File {
  path: string;
  name: string;
  content: string;
  description?: string;
  dependencies?: string[];
  relevant?: boolean;
}
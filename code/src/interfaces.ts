export interface Approach {
  approach: string;
  steps?: Step[];
}

export interface Step {
  step: string;
  steps?: Step[];
}
export interface Approach {
  approach: string;
  steps?: ApproachStep[];
}

export interface ApproachStep {
  step: string;
  subSteps: Approach[];
}
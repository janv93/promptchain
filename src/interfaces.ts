export interface Approach {
  approach: string;
  steps?: Step[];
};

export interface Step {
  step: string;
  steps?: Step[];
};

export interface File {
  path: string; // tmp\\src\\app\\app-routing.module.ts
  name: string; // app-routing.module.ts
  content: string;
  description?: string;
  dependencies?: string[]; // ['home-page', 'demo-page']
  relevant?: boolean;
  modified?: boolean;
  modification?: string;
  modifiedContent?: string;
  rename?: string;  // new-name.ts
}
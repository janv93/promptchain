import BaseController from '../base-controller';

export default class BrainGpt extends BaseController {
  public async run(prompt): Promise<string> {
    return prompt;
  }
}
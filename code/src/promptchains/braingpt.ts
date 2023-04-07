import OpenAi from '../apis/openai';
import BaseController from '../base-controller';

export default class BrainGpt extends BaseController {
  private openAi = new OpenAi();

  public async chain(prompt): Promise<string> {
    this.openAi.clearChatMessages();
    return this.generateContext(prompt);
  }

  private async generateContext(prompt: string): Promise<string> {
    const message = `Generate a list of information that would be helpful in solving this prompt:\n${prompt}`;
    this.openAi.addChatMessage(message);
    return this.openAi.postCompletionChat();
  }
}
import OpenAi from './apis/openai';
import { Step } from './interfaces';

export default class Communication {
  protected openAi = new OpenAi();
  protected systemMessage: string;
  protected messages = [];

  constructor() { }

  protected lastMessage(): string {
    return this.messages.at(-1).content;
  }

  // chat with history
  protected async chat(message: string): Promise<void> {
    this.addChatMessage(message, true);
    const res = await this.openAi.postCompletionChat(this.messages);
    this.addChatMessage(res, false);
  }

  protected async chatSingle(message: string): Promise<string> {
    const messages = [
      { role: 'system', content: this.systemMessage },
      { role: 'user', content: message }
    ];

    return this.openAi.postCompletionChat(messages);
  }

  protected addChatMessage(content: string, isUser: boolean): void {
    this.messages.push({ role: isUser ? 'user' : 'assistant', content });
  }

  protected resetChatMessages(): void {
    this.messages = [
      { role: 'system', content: this.systemMessage }
    ];
  }

  protected getSteps(list: string): Array<string> {
    const regex = /\d\.\s+|\n+/g;
    return list.split(regex).filter(step => step.trim() !== '');
  }

  protected createNumberedListString(steps: Step[], prefix = ''): string {
    let result = '';

    steps.forEach((s, i) => {
      const number = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      result += `${number}. ${s.step}\n`;

      if (s.steps) {
        result += this.createNumberedListString(s.steps, number);
      }
    });

    return result;
  }
}
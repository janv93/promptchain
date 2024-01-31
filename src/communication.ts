import OpenAi from './apis/openai';
import { encode } from 'gpt-3-encoder';
import { Step } from './interfaces';

export default class Communication {
  protected openAi = new OpenAi();
  protected systemMessage: string;
  protected messages = [];

  constructor() { }

  protected setModel(model: number) {
    switch(model) {
      case 3.5: this.openAi.model = 'gpt-3.5-turbo'; break;
      case 4: this.openAi.model = 'gpt-4'; break;
      case 4.5: this.openAi.model = 'gpt-4-turbo-preview'; break;
    }
  }

  protected countTokens(str: string) {
    if (str.length > 100000) return str.length / 2;
    return encode(str).length;
  }

  protected getCallCount(): number {
    return this.openAi.count;
  }

  protected lastMessage(): string {
    return this.messages.at(-1).content;
  }

  // chat with history
  protected async chat(message: string): Promise<void> {
    this.addChatMessage(message, true);
    const res = await this.openAi.postCompletionChat(this.messages);
    this.addChatMessage(res, false);
  }

  protected async chatSingle(message: string, funcs?: any[], forceFunc?: string): Promise<any> {
    const messages = [
      { role: 'system', content: this.systemMessage },
      { role: 'user', content: message }
    ];

    return this.openAi.postCompletionChat(messages, null, funcs, forceFunc);
  }

  protected addChatMessage(content: string, isUser: boolean): void {
    this.messages.push({ role: isUser ? 'user' : 'assistant', content });
  }

  protected resetChatMessages(): void {
    this.messages = [
      { role: 'system', content: this.systemMessage }
    ];
  }

  // extract array of steps from a string, only returns the most inner depth of the list
  protected getSteps(list: string): string[] {
    list = '\n' + list;

    const lines = list.split('\n').map(line => line.trim());

    const linesWithNumeration = lines.filter(line => {
      const match = line.match(/^\d+(\.\d+)*\./);
      return match !== null;
    });

    const depths = [];

    linesWithNumeration.forEach(l => {
      const numeration = l.match(/^\d+(\.\d+)*\./)[0];
      const depth = numeration.split('.').length;
      if (!depths.includes(depth)) depths.push(depth);
    });

    const deepest = Math.max(...depths);

    const childLines = linesWithNumeration.filter(l => {
      const numeration = l.match(/^\d+(\.\d+)*\./)[0];
      const depth = numeration.split('.').length;
      return depth === deepest;
    });

    const childLinesText = childLines.map(l => l.replace(/^\d+(\.\d+)*\./, '').trim());
    return childLinesText;
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
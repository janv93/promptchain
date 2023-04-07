import OpenAi from './apis/openai';

export default class Communication {
  protected openAi = new OpenAi();
  protected systemMessage: string;
  protected messages = [];

  constructor() { }

  protected lastMessage(): string {
    return this.messages.at(-1).content;
  }

  protected async chat(message: string): Promise<void> {
    this.addChatMessage(message);
    const res = await this.openAi.postCompletionChat(this.messages);
    this.addChatMessage(res);
  }

  protected addChatMessage(content: string): void {
    this.messages.push({ role: 'user', content });
  }

  protected resetChatMessages(): void {
    this.messages = [
      { role: 'system', content: this.systemMessage }
    ];
  }

  protected async getListLength(list: string): Promise<number> {
    const message = `${list}\n\n
Return the number of items in this list as a number, nothing else.`;

    const messages = [
      { role: 'system', content: 'You are an AI language model.' },
      { role: 'user', content: message }
    ];

    const res = await this.openAi.postCompletionChat(messages);
    return Number(res);
  }
}
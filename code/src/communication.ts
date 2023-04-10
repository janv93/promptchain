import OpenAi from './apis/openai';

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
      { role: 'user' , content: message }
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

  protected async getListLength(list: string): Promise<number> {
    const message = `${list}\n\n
Return the number of items in this list as a number. Only output the number, nothing else.`;

    const messages = [
      { role: 'system', content: 'You are an AI language model.' },
      { role: 'user', content: message }
    ];

    const res = await this.openAi.postCompletionChat(messages);
    return parseInt(res.match(/\d+/)?.[0], 10);
  }

  protected async getStep(list: string, step: number): Promise<string> {
    const message = `${list}\n\n
Return step ${step} of this list without the leading number. Only output the step, nothing else`;

    const messages = [
      { role: 'system', content: 'You are an AI language model.' },
      { role: 'user', content: message }
    ];

    return this.openAi.postCompletionChat(messages);
  }
}
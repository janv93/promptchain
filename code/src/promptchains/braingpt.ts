import Communication from '../communication';

export default class BrainGpt extends Communication {
  private initialPrompt: string;
  private context: string;
  private approaches: string;

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.\n
Your knowledge cutoff is September 2021. You do not have access to information later than that.
You are part of an algorithm which tries to solve any, even the most complex prompt using vector databases, chain of thought, reflection and correction and other techniques.\n
The goal is to solve the prompt just using your knowledge, you are not given tools. Consider this at every step.\n
Each step of this conversation tries to enhance the initial prompt.`;
  }

  public async chain(prompt): Promise<string> {
    this.resetChatMessages();
    this.initialPrompt = prompt;
    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.executeApproaches();
    const answer = this.lastMessage();
    this.resetChatMessages();
    return answer;
  }

  private async generateContextIdeas(): Promise<void> {
    const message = `You are being asked the following prompt:\n
"${this.initialPrompt}"\n
Generate a list contextual information that is helpful to answer the prompt.
For example when you are being asked a word with the same letter as the capital of France, the contextual information would be 1. Paris is the capital and 2. P is its starting letter.\n
Now apply similar enhancing to the prompt. Only output the numerated list, nothing before or after the list.`;

    await this.chat(message);
  }

  private async generateContext(): Promise<void> {
    const message = `Now add the actual information for each bullet point.`;
    await this.chat(message);
    this.context = this.lastMessage();
  }

  private async generateApproaches(): Promise<void> {
    const lastMessage = this.lastMessage();
    this.resetChatMessages();

    const message = `You are being asked the following prompt:\n
"${this.initialPrompt}"\n
You were given the following context information:\n
${lastMessage}\n\n
Now, I want you to generate a list of approaches on how to find a solution for the prompt. Only output the numerated list, nothing before or after the list.`

    await this.chat(message);
    this.approaches = this.lastMessage();
  }

  private async executeApproaches(): Promise<void> {
    console.log(this.messages);
    const last = this.lastMessage();
    const length = await this.getListLength(last);
    const promises = [];

    for (let i = 0; i < length; i++) {
      promises.push(this.getStep(last, i + 1 ));
    }

    const steps = await Promise.all(promises);
  }
}
import Communication from '../communication';

export default class BrainGpt extends Communication {
  private initialPrompt: string;

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.\n
You knowledge cutoff is September 2021. You do not have access to information later than that.
You are part of an algorithm which tries to solve any, even the most complex prompt using vector databases, chain of thought, reflection and correction and other techniques.\n
Each step of this conversation tries to enhance the initial prompt.`;
  }

  public async chain(prompt): Promise<string> {
    this.resetChatMessages();
    this.initialPrompt = prompt;
    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.doApproaches();
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
  }

  private async doApproaches(): Promise<void> {
    const length = await this.getListLength(this.messages.at(-1).content);
    console.log(length)

    for (let i = 0; i < length; i++) {
      // generate approaches
    }
  }
}
import Communication from '../communication';
import { Approach } from '../interfaces';

export default class BrainGpt extends Communication {
  private initialPrompt: string;
  private context: string;
  private approaches: Approach[];

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.\n
Your knowledge cutoff is September 2021. You do not have access to information later than that. You do not have access to the internet and you cannot consult anyone.\n
You are part of an algorithm which tries to solve any, even the most complex prompt using vector databases, chain of thought, reflection and correction and other techniques.\n
The goal is to solve the prompt just using your knowledge, you are not given tools. Consider this at every task.\n
Each step of this conversation tries to enhance the initial prompt and get closer to a complete answer.`;
  }

  public async chain(prompt): Promise<string> {
    this.resetChatMessages();
    this.initialPrompt = prompt;
    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.generateSteps();
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
    this.resetChatMessages();

    const message = `You are being asked the following prompt:\n
"${this.initialPrompt}"\n
You were given the following context information:\n
${this.context}\n\n
Now, I want you to generate a list of approaches on how to find a solution for the prompt. Only generate approaches that you yourself can do from just memory. Only output the numerated list, nothing before or after the list.`

    await this.chat(message);
    const last = this.lastMessage();
    const length = await this.getListLength(last);
    const promises = [];

    for (let i = 0; i < length; i++) {
      promises.push(this.getStep(last, i + 1));
    }

    const approaches = await Promise.all(promises);
    this.approaches = approaches.map(a => ({ approach: a }));
  }

  private async generateSteps() {
    const approachesWithSteps = await Promise.all(this.approaches.map(a => this.generateApproachSteps(a)));
    console.log(approachesWithSteps);
  }

  private async generateApproachSteps(approach: Approach): Promise<Approach> {
    const message = `To solve the prompt "${this.initialPrompt}" the following approach is given:\n
"${approach.approach}"\n\n
Generate a numerated list with steps for this approach. Only output the numerated list, nothing before or after the list.`;

    const res = await this.chatSingle(message);
    const length = await this.getListLength(res);
    const promises = [];

    for (let i = 0; i < length; i++) {
      promises.push(this.getStep(res, i + 1));
    }

    approach.steps = await Promise.all(promises);
    return approach;
  }
}
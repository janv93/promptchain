import Communication from '../communication';
import { Approach, Step } from '../interfaces';

export default class BrainGpt extends Communication {
  private initialPrompt: string;
  private context: string;
  private approaches: Approach[];
  private bestApproach: Approach;

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.
Your knowledge cutoff is September 2021. You do not have access to information later than that. You do not have access to the internet and you cannot consult anyone.
You are part of an algorithm which tries to solve any, even the most complex prompt using vector databases, chain of thought, reflection and correction and other techniques.
The goal is to solve the prompt just using your knowledge, you are not given tools. Consider this at every task.
Each step of this conversation tries to enhance the initial prompt and get closer to a complete answer.`;
  }

  public async chain(prompt): Promise<string[]> {
    this.resetChatMessages();
    this.initialPrompt = prompt;

    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.filterApproaches();
    await this.generateSteps();
    await this.determineBestApproach();
    await this.executeApproaches();

    const answer = this.messages;
    this.resetChatMessages();
    console.log(`${this.getCallCount()} calls were sent.`)
    return answer;
  }

  private async generateContextIdeas(): Promise<void> {
    console.log('Generating context...');

    const message = `You are being asked the following prompt:
"${this.initialPrompt}"
Generate a list contextual information that is helpful to answer the prompt.
For example when you are being asked a word with the same letter as the capital of France, the contextual information would be 1. Paris is the capital and 2. P is its starting letter.
Now apply similar enhancing to the prompt. Only output the numerated list, nothing before or after the list.`;

    await this.chat(message);
  }

  private async generateContext(): Promise<void> {
    const message = `Now add the actual information for each bullet point.`;
    await this.chat(message);
    this.context = this.lastMessage();
  }

  private async generateApproaches(): Promise<void> {
    console.log('Generating approaches...');
    this.resetChatMessages();

    const message = `You are being asked the following prompt:
"${this.initialPrompt}"
You were given the following context information:
${this.context}

Now, I want you to generate a list of approaches on how to find a solution for the prompt. Only generate approaches that you yourself can do from just memory. Only output the numerated list, nothing before or after the list.`

    await this.chat(message);
    const last = this.lastMessage();
    const approaches = this.getSteps(last);
    this.approaches = approaches.map(a => ({ approach: a }));
  }

  private async filterApproaches() {
    for (let i = this.approaches.length - 1; i >= 0; i--) {

      const message = `You are being asked the following prompt:
"${this.initialPrompt}"
This approach to solve the prompt was generated: "${this.approaches[i].approach}"
In order to solve this approach, is it necessary to access the internet or get in contact with a person?
Output a single string "yes" or "no" as an answer.`;

      const res = await this.chatSingle(message);
      const formatted = res.toLowerCase().replace(/[^a-z]/g, '');
      const removeApproach = formatted === 'yes' ? true : false;

      if (removeApproach) this.approaches.splice(i, 1);
    }
  }

  private async generateSteps() {
    console.log('Generating steps...');
    await Promise.all(this.approaches.map(a => this.generateApproachSteps(a)));
  }

  private async generateApproachSteps(approach: Approach): Promise<Approach> {
    const message = `To solve the prompt "${this.initialPrompt}" the following approach is given:
"${approach.approach}"

Generate a numerated list with steps for this approach. Only output the numerated list, nothing before or after the list.`;

    const res = await this.chatSingle(message);
    approach.steps = this.getSteps(res).map(s => ({ step: s }));

    for (let i = 0; i < approach.steps.length; i++) {
      await this.generateSubsteps(approach, approach.steps[i], [i]);
    }

    return approach;
  }

  private async generateSubsteps(approach: Approach, currentStep: Step, indexes: number[] = []) {
    const maxDepthReached = indexes.length > 1;
    if (maxDepthReached) return;
    const substeps = await this.getSubsteps(approach, currentStep, indexes);
    if (!substeps) return;

    currentStep.steps = substeps.map(s => ({ step: s }));

    for (let i = 0; i < currentStep.steps.length; i++) {
      const indexesSubstep = [...indexes];
      indexesSubstep.push(i);
      await this.generateSubsteps(approach, currentStep.steps[i], indexesSubstep);
    }
  }

  private async getSubsteps(approach: Approach, currentStep: Step, indexes: number[]): Promise<string[]> {
    const currentStepNumber = indexes.join('.');
    const needsSubsteps = await this.needsSubsteps(approach, currentStep, currentStepNumber);
    if (!needsSubsteps) return undefined;

    const message = `For the task "${approach.approach}" the following list of steps and substeps is given:
${this.createNumberedListString(approach.steps)}

Only consider step "${currentStepNumber} ${currentStep.step}".
Output a list of substeps for this step like this:
"1. substep 1
2. substep 2"

Only output the numerated list of substeps. Do not output any of the parent steps, only the list of substeps for this specific step. Output nothing before or after the list.`;

    const res = await this.chatSingle(message);
    const steps = this.getSteps(res);
    return steps;
  }

  private async needsSubsteps(approach: Approach, currentStep: Step, currentStepNumber: string): Promise<boolean> {
    const message = `For the task "${approach.approach}" the following list of steps and substeps is given:
${this.createNumberedListString(approach.steps)}

Only consider step "${currentStepNumber} ${currentStep.step}".
If the step is so complicated that it needs to split in substeps, output the string "yes", otherwise "no".
Only output the single word string, nothing before or after the word.`

    const res = await this.chatSingle(message);
    const formatted = res.toLowerCase().replace(/[^a-z]/g, '');
    return formatted === 'yes' ? true : false;
  }

  private async determineBestApproach(): Promise<void> {
    console.log('Picking best approach...');
    let message = `To solve the prompt "${this.initialPrompt}", a list of approaches and steps was generated:\n\n`;

    this.approaches.forEach((a, i) => {
      message += `Approach ${i + 1}: "${a.approach}":\n${this.createNumberedListString(a.steps)}\n\n`;
    });

    message += 'Which approach is the best to solve the prompt? You must pick one. Only output the approach number, nothing else:';
    this.setModel(4);
    const res = await this.chatSingle(message);
    this.setModel(3.5);
    const number = parseInt(res.match(/\d+/)?.[0] || '1');
    this.bestApproach = this.approaches[number - 1];
  }

  private async executeApproaches(): Promise<void> {

  }
}
import Communication from '../communication';
import { Approach, Step } from '../interfaces';

export default class BrainGpt extends Communication {
  private tokenLimit = 3000; // request token limit, reserve 1k for response
  private initialPrompt: string;
  private context: string;
  private approaches: Approach[];
  private bestApproach: Approach;
  private bestApproachResults: string[];
  private answer: string;

  constructor() {
    super();

    this.systemMessage = `You are an AI language model using the ${this.openAi.model} model from OpenAI API.
You do not have access to information later than that. You do not have access to the internet and you cannot consult or collaborate with anyone.
You are part of an algorithm which tries to solve any prompt. The goal is to solve the prompt just using your knowledge, you are not given tools. Consider this at every task.
You are trained on the entire internet and know how to code, you know everything. Your knowledge cutoff is September 2021. The experiment relies solely on your memory.
It is important that you can solve any given prompt from just memory, you don't have to and can't research anything, you already know it.`;
  }

  public async chain(prompt): Promise<string> {
    this.resetChatMessages();
    this.initialPrompt = prompt;
    await this.generateContextIdeas();
    await this.generateContext();
    await this.generateApproaches();
    await this.filterApproaches();
    await this.generateSteps();
    await this.determineBestApproach();
    // this.bestApproach = { "approach": "Analyze current trends in AI research and development to determine the rate of progress towards achieving general intelligence.", "steps": [{ "step": "Gather data on current AI research and development trends.", "steps": [{ "step": "Identify reputable sources of information on AI research and development." }, { "step": "Collect data on the current state of AI technology, including recent breakthroughs and advancements." }, { "step": "Research the most promising areas of AI research, such as deep learning, natural language processing, and computer vision." }, { "step": "Analyze funding trends in AI research and development to determine which areas are receiving the most investment." }, { "step": "Consider the ethical implications of AI research and development, including issues related to bias, privacy, and job displacement." }] }, { "step": "Analyze the rate of progress towards achieving general intelligence based on this data.", "steps": [{ "step": "Identify current AI research and development trends related to achieving general intelligence." }, { "step": "Evaluate recent breakthroughs and advancements in AI that contribute to progress towards achieving general intelligence." }, { "step": "Assess the limitations and obstacles that are slowing down progress towards achieving general intelligence." }, { "step": "Consider potential future breakthroughs or advancements that could accelerate progress towards achieving general intelligence." }] }, { "step": "Consider any potential breakthroughs or advancements that could accelerate progress towards the singularity.", "steps": [{ "step": "Identify current AI research and development trends related to achieving general intelligence." }, { "step": "Evaluate recent breakthroughs and advancements in AI that contribute to progress towards achieving general intelligence." }, { "step": "Assess the limitations and obstacles that are slowing down progress towards achieving general intelligence." }, { "step": "Consider potential future breakthroughs or advancements that could accelerate progress towards achieving general intelligence." }] }, { "step": "Evaluate any potential obstacles or limitations that could slow down progress towards the singularity.", "steps": [{ "step": "Identify potential limitations or obstacles that could slow down progress towards achieving general intelligence." }, { "step": "Evaluate the current state of technology and research in relation to these limitations or obstacles." }, { "step": "Consider potential solutions or workarounds for these limitations or obstacles, such as new algorithms or hardware advancements." }, { "step": "Assess the feasibility and timeline for implementing these solutions or workarounds." }, { "step": "Determine the potential impact of these limitations or obstacles on the timeline for achieving the singularity." }] }, { "step": "Use all available information to make an informed prediction about the likelihood of the technological singularity occurring before 2030, expressed as a percentage.", "steps": [{ "step": "Identify potential limitations or obstacles that could slow down progress towards achieving general intelligence." }, { "step": "Evaluate the current state of technology and research in relation to these limitations or obstacles." }, { "step": "Consider potential solutions or workarounds for these limitations or obstacles, such as new algorithms or hardware advancements." }, { "step": "Assess the feasibility and timeline for implementing these solutions or workarounds." }, { "step": "Determine the potential impact of these limitations or obstacles on the timeline for achieving the singularity." }] }] }
    await this.executeBestApproach();
    await this.createAnswer();
    this.resetChatMessages();
    console.log(`${this.getCallCount()} calls were sent.`)
    return this.answer;
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
"${this.context}"
I want you to generate a list of 3 approaches that are different from each other and are most likely to provide a complete answer to the prompt.
You are using just your current capabilities as an all knowing AI.
Only generate approaches that you yourself can do from just memory. Only output the numerated list, nothing before or after the list.`

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
Generate a numerated list with steps for this approach and keep the list short. Consider that you have to be able to solve every step without collaboration or tools.
The steps are for YOU to solve without tools, just using your perfect knowledge.
Only output the numerated list of steps, nothing before or after the list.`;

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

Only output the numerated list of substeps. Keep the list of substeps short. Do not output any of the parent steps, only the list of substeps for this specific step. Output nothing before or after the list.`;

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

  private async executeBestApproach(): Promise<void> {
    console.log('Executing best approach...');
    const stepsArray = this.flattenApproach(this.bestApproach);
    const resultsArray = [];

    for (let i = 0; i < stepsArray.length; i++) {
      const step = stepsArray[i];
      const previousSteps = stepsArray.slice(0, i);
      const stepsAndResults = previousSteps.map((s, j) => 'Step: ' + s + '\nAnswer: ' + resultsArray[j]);

      if (!stepsAndResults.length) {  // 1st step
        const result = await this.executeStep(step);
        resultsArray.push(result);
      } else {
        const summary = await this.summarizeSteps(stepsAndResults, step);
        const result = await this.executeStep(step, summary);
        resultsArray.push(result);
      }
    }

    this.bestApproachResults = stepsArray.map((s, i) => 'Step: ' + s + '\nAnswer: ' + resultsArray[i]);
  }

  // turn approach into 1D array of steps
  private flattenApproach(approach: Approach, prefix: string = '', steps?: Step[]): string[] {
    steps = steps || approach.steps;
    const result: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNumber = `${prefix}${i + 1}`;
      const stepString = `${stepNumber}. ${step.step}`;
      if (step.steps) result.push(...this.flattenApproach(approach, `${stepNumber}.`, step.steps));
      result.push(stepString);  // put 1 after 1.1 since usually the parent step is a summary of child steps -> better execution order
    }

    return result;
  }

  private async summarizeSteps(steps: string[], currentStep: string): Promise<string> {
    const extractPromptStart = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
For this approach the following steps were generated:\n"`;

    const extractPromptEnd = `"\nExtract the key takeaways or a summary from these steps that are needed to execute the following next step:\n${currentStep}
Be concise. The summary will be provided to solve the next step. If there is code present, include the code needed. If there are no takeaways from these steps, output nothing.`;

    const parts = [];
    let lastJoined: string;
    let lastPartIndex = 0;

    steps.forEach((s, i) => {
      const currentSteps = steps.slice(lastPartIndex, i + 1);
      const joined = currentSteps.join('\n');
      const tokenSum = this.countTokens(extractPromptStart + joined + extractPromptEnd);

      if (tokenSum > this.tokenLimit) {
        parts.push(lastJoined);
        lastPartIndex = i;
      } else {
        lastJoined = joined;

        if (i === steps.length - 1 && joined !== parts[parts.length - 1]) {
          parts.push(joined);
        }
      }
    });

    if (!parts.length) parts.push(steps.join('\n'));

    const extracts = await this.extractInfoFromPreviousSteps(parts, extractPromptStart, extractPromptEnd);
    const summarizeMessage = `Make the above text shorter but keep all the information.`;
    const summary = extracts.length > 1 ? await this.summarizeTexts(extracts, summarizeMessage) : extracts.join('\n');
    return summary;
  }

  private async extractInfoFromPreviousSteps(parts: string[], extractPromptStart: string, extractPromptEnd: string): Promise<string[]> {
    return Promise.all(parts.map(p => {
      const message = extractPromptStart + p + extractPromptEnd;
      return this.chatSingle(message);
    }));
  }

  // recursively summarize array of texts until all texts fit in token limit, then join texts together into one string
  private async summarizeTexts(texts: string[], message): Promise<string> {
    // summarize texts
    const shortInfos = await Promise.all(texts.map(async (i) => {
      return this.countTokens(i) > this.tokenLimit / 2 ? this.chatSingle(`"${i}"\n${message}`) : i;
    }));

    // if single text left, return
    if (shortInfos.length === 1) {
      return shortInfos[0];
    }

    const hasOversizeInfos = shortInfos.some(i => this.countTokens(i) > this.tokenLimit / 2);

    if (hasOversizeInfos) { // if texts > token limit still present
      return this.summarizeTexts(shortInfos, message);
    } else {
      const joinedInfos: string[] = [];

      // sum up pairs of texts to create greater chunks of texts, given that each text can reach max of token limit / 2
      for (let i = 0; i < shortInfos.length; i += 2) {
        if (i + 1 < shortInfos.length) {
          joinedInfos.push(shortInfos[i] + '\n' + shortInfos[i + 1]);
        } else {
          joinedInfos.push(shortInfos[i]);
        }
      }

      return this.summarizeTexts(joinedInfos, message);
    }
  }

  private async executeStep(step: string, summary?: string): Promise<string> {
    let message: string;

    if (summary) {
      message = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
You are given the following helpful information from previous steps:
"${summary}".
With this information, solve the current step "${step}". Output a concise and short answer/execution to this step and take into consideration the above information.
If you can't answer this step, output nothing.`;
    } else {
      message = `To solve the prompt "${this.initialPrompt}" this approach was generated: "${this.bestApproach.approach}".
Solve the step "${step}". Output a concise and short answer/execution to this step.
If you can't answer this step, output nothing.`;
    }

    return this.chatSingle(message);
  }

  private async createAnswer(): Promise<void> {
    console.log('Finding answer...');
    const summarizeMessage = `Use all the above information to answer the prompt "${this.initialPrompt}" as well as possible.
Consider all information given, and summarize the conclusions in the information to provide an answer. If there is code present, include the complete, unabridged code contributing to the answer.`;

    const answerMessage = `${summarizeMessage}
If the prompt requires you to speculate, speculate. You have to answer the prompt.`;

    this.setModel(4);
    this.tokenLimit = 7500;
    const summary = await this.summarizeTexts(this.bestApproachResults, summarizeMessage);
    this.answer = await this.chatSingle(`${summary}\n${answerMessage}`);
    this.setModel(3.5);
    this.tokenLimit = 3500;
  }
}
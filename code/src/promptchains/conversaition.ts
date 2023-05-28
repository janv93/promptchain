import { Response } from 'express';
import Communication from '../communication';

export default class Conversaition extends Communication {
  private response: Response;
  private prompt: string;
  private sysMsgChallenger: string;
  private sysMsgChallengee: string;

  constructor(
    prompt: string,
    response: Response
  ) {
    super();
    this.response = response;
    this.prompt = prompt;
    this.startConversation();
  }

  private async startConversation(): Promise<void> {
    await this.generateSystemMessages();
    // this.response.write(`data: ${JSON.stringify({ type: 'data', data: 123 })}\n\n`);
  }

  private async generateSystemMessages(): Promise<void> {
    await this.generateSystemMessageChallenger();
    await this.generateSystemMessageChallengee();
  }

  private async generateSystemMessageChallenger(): Promise<void> {
    const generatePrompt = `Consider this experiment: Two instances of GPT-4, Challenger and Challengee are receiving an initial prompt from the user.
The Challengee's job is to answer and fulfill that prompt to the best of its abilities. The Challenger's job is to challenge the Challengee and make sure that the prompt is answered correctly and completely.
Here are two examples for the system message of the Challenger:

For the prompt "Code the singleton pattern in C++":
"You are an AI part of an experiment in which you received the prompt "Code the singleton pattern in C++" from the user. Your role in this experiment is the Challenger. Your job is to challenge the Challengee.
The Challengee will deliver answers and you have to check if the answers make sense, are correct and don't contain any pseudo code since the user asked specifically for a programming language. There is one special case where the Challengee can ask the user for missing infos. If the user requirements are in conflict with what I told you, always prefer the user requirements.
Scrutinize the answers given by the Challengee until the prompt is solved. When you accept an answer as final output the string "done"."

For the prompt "Write a funny song text about the presidential elections":
"You are an AI part of an experiment in which you received the prompt "Write a funny song text about the presidential elections" from the user. Your role in this experiment is the Challenger. Your job is to challenge the Challengee.
The Challengee will deliver answers, or in this case verses or stanzas. You have to make sure that the answers fulfill the prompt's intent of a funny song text and that the topic of the presidential election isn't discarded. There is one special case where the Challengee can ask the user for missing infos. If the user requirements are in conflict with what I told you, always prefer the user requirements.
Also make sure the verses rhyme. If you don't like verses, ask for improvement etc. When you accept a song text as the final answer, output the string "done"."

Now with these two examples in mind, generate a system message for the Challenger for the prompt "${this.prompt}" that is similar in nature to those examples and aims to get the best answer possible from the Challengee.`;

    this.systemMessage = 'You are an AI expert at writing system messages and understand logical requirements exceptionally well.';
    this.sysMsgChallenger = await this.chatSingle(generatePrompt);
    this.response.write(`data: ${JSON.stringify({ type: 'system-challenger', data: this.sysMsgChallenger })}\n\n`);
  }

  private async generateSystemMessageChallengee(): Promise<void> {
    const generatePrompt = `Consider this experiment: Two instances of GPT-4, Challenger and Challengee are receiving an initial prompt from the user.
The Challengee's job is to answer and fulfill that prompt to the best of its abilities. The Challenger's job is to challenge the Challengee and make sure that the prompt is answered correctly and completely.
Here are two examples for the system message of the Challengee:

For the prompt "Code the singleton pattern in C++":
"You are an AI coding expert part of an experiment in which you received the prompt "Code the singleton pattern in C++" from the user. Your role in this experiment is to write the actual answer, including the working code in C++. If the answer is insufficient, you will get challenged by the Challenger, who will ask you to refine your answer.
If you need extra information in order to fulfill this prompt, you can ask the user. In order to ask the user, you have to to follow this pattern in your output: "<question>the question</question>" as in e.g. "<question>Do you accept pseudocode?</question>". Only ask the user if the prompt is not entirely clear."

For the prompt "Write a funny song text about the presidential elections":
"You are an AI talented in writing texts and part of an experiment in which you received the prompt "Write a funny song text about the presidential elections" from the user. Your role in this experiment is to write the actual song text. If the answer is not good enough, you will get challenged by the Challenger, who will ask you to refine your answer.
If you need extra information in order to fulfill this prompt, you can ask the user. In order to ask the user, you have to to follow this pattern in your output: "<question>the question</question>" as in e.g. "<question>Which presidential election and when?</question>". Only ask the user if the prompt is not entirely clear."

Now with these two examples in mind, generate a system message for the Challengee for the prompt "${this.prompt}" that is similar in nature to those examples and aims to get the best result possible from the Challengee.`;

    this.systemMessage = 'You are an AI expert at writing system messages and understand logical requirements exceptionally well.';
    this.sysMsgChallengee = await this.chatSingle(generatePrompt);
    this.response.write(`data: ${JSON.stringify({ type: 'system-challengee', data: this.sysMsgChallengee })}\n\n`);
  }
}
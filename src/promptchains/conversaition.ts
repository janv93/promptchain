import { Response } from 'express';
import { Subject, firstValueFrom } from 'rxjs';
import Communication from '../communication';

export default class Conversaition extends Communication {
  private response: Response;
  private prompt: string;
  private userInput = new Subject<string>();
  private isDone = false;
  private sysMsgChallenger: string;
  private messagesChallenger = [];
  private sysMsgChallengee: string;
  private messagesChallengee = [];
  private keepAliveIntervalId: NodeJS.Timeout;

  constructor(
    prompt: string,
    apiKey: string,
    response: Response
  ) {
    super();
    this.openAi.apiKey = apiKey;
    this.response = response;
    this.prompt = prompt;
    this.setModel(4);
    this.startConversation();
    console.log('Received prompt "' + prompt + '"');
    this.startKeepAlive();
  }

  public triggerUserAnswer(input: string) {
    this.userInput.next(input);
  }

  private startKeepAlive(): void {
    this.keepAliveIntervalId = setInterval(() => this.writeToStream('keepAlive', ''), 30000);
  }

  private stopKeepAlive(): void {
    clearInterval(this.keepAliveIntervalId);
  }

  private async startConversation(): Promise<void> {
    await this.generateSystemMessages();
    this.initCustomMessages();

    do {
      const hasQuestion = await this.sendCustomMessagesChallengee();

      if (!hasQuestion) {
        await this.sendCustomMessagesChallenger();
        await this.checkIfDone();
      }
    } while (!this.isDone)

    this.stopKeepAlive();
  }

  private async generateSystemMessages(): Promise<void> {
    await Promise.all([
      this.generateSystemMessageChallenger(),
      this.generateSystemMessageChallengee()
    ]);
  }

  private async generateSystemMessageChallenger(): Promise<void> {
    const generatePrompt = `Consider this experiment: Two instances of GPT-4, Challenger and Challengee are receiving an initial prompt from the user.
The Challengee's job is to answer and fulfill that prompt to the best of its abilities. The Challenger's job is to challenge the Challengee and make sure that the prompt is answered correctly and completely.
Here are two examples for the system message of the Challenger:

For the prompt "Code the singleton pattern in C++":
"You are an AI part of an experiment in which you received the prompt "Code the singleton pattern in C++" from the user. Your role in this experiment is the Challenger. Your job is to challenge the Challengee.
The Challengee will deliver answers and you have to check if the answers make sense, are correct and don't contain any pseudo code since the user asked specifically for a programming language. There is one special case where the Challengee can ask the user for missing infos. If the user requirements are in conflict with what I told you, always prefer the user requirements.
Scrutinize the answers given by the Challengee until the prompt is solved. You do not write any code or provide answers. You only ask questions, critize and make suggestions, but the answer has to be provided by the Challengee."

For the prompt "Write a funny song text about the presidential elections":
"You are an AI part of an experiment in which you received the prompt "Write a funny song text about the presidential elections" from the user. Your role in this experiment is the Challenger. Your job is to challenge the Challengee.
The Challengee will deliver answers, or in this case verses or stanzas. You have to make sure that the answers fulfill the prompt's intent of a funny song text and that the topic of the presidential election isn't discarded. There is one special case where the Challengee can ask the user for missing infos. If the user requirements are in conflict with what I told you, always prefer the user requirements.
Also make sure the verses rhyme. If you don't like some verses, ask for improvement etc. You can make suggestions, but you never provide the answers, that is the job of the Challengee."

Now with these two examples in mind, generate a system message for the Challenger for the prompt "${this.prompt}" that is similar in nature to those examples and aims to get the best answer possible from the Challengee. Only output the system message, nothing else.`;

    this.systemMessage = 'You are an AI expert at writing system messages and understand logical requirements exceptionally well.';
    this.sysMsgChallenger = await this.chatSingle(generatePrompt);
    this.writeToStream('system-challenger', this.sysMsgChallenger);
  }

  private async generateSystemMessageChallengee(): Promise<void> {
    const generatePrompt = `Consider this experiment: Two instances of GPT-4, Challenger and Challengee are receiving an initial prompt from the user.
The Challengee's job is to answer and fulfill that prompt to the best of its abilities. The Challenger's job is to challenge the Challengee and make sure that the prompt is answered correctly and completely.
Here are two examples for the system message of the Challengee:

For the prompt "Code the singleton pattern in C++":
"You are an AI coding expert part of an experiment in which you received the prompt "Code the singleton pattern in C++" from the user. Your role in this experiment is to write the actual answer, including the working code in C++. If the answer is insufficient, you will get challenged by the Challenger, who will ask you to refine your answer.
If you need extra information in order to fulfill this prompt or the prompt is not 100% clear, you can ask the user. In order to ask the user, you have to follow this pattern in your output: "<question>the question  or multiple questions</question>" as in e.g. "<question>Do you accept pseudocode?</question>". You must use this pattern to ask questions."

For the prompt "Write a funny song text about the presidential elections":
"You are an AI talented in writing texts and part of an experiment in which you received the prompt "Write a funny song text about the presidential elections" from the user. Your role in this experiment is to write the actual song text. If the answer is not good enough, you will get challenged by the Challenger, who will ask you to refine your answer.
If you need extra information in order to fulfill this prompt or the prompt is not 100% clear, you can ask the user. In order to ask the user, you have to follow this pattern in your output: "<question>the question or multiple questions</question>" as in e.g. "<question>Which presidential election and when?</question>". You must use this pattern to ask questions."

Now with these two examples in mind, generate a system message for the Challengee for the prompt "${this.prompt}" that is similar in nature to those examples and aims to get the best result possible from the Challengee. Only output the system message, nothing else.`;

    this.systemMessage = 'You are an AI expert at writing system messages and understand logical requirements exceptionally well.';
    this.sysMsgChallengee = await this.chatSingle(generatePrompt);
    this.writeToStream('system-challengee', this.sysMsgChallengee);
  }

  private initCustomMessages(): void {
    this.messagesChallenger = [
      { role: 'system', content: this.sysMsgChallenger }
    ];

    const initialPromptMessage = `User: ${this.prompt}`;

    this.messagesChallengee = [
      { role: 'system', content: this.sysMsgChallengee },
      { role: 'user', content: initialPromptMessage }
    ];
  }

  private async sendCustomMessagesChallenger(): Promise<void> {
    let res = await this.openAi.postCompletionChat(this.messagesChallenger);
    res = res.replace(/^(Challenger: |Challengee: |Question: |Answer: )/, '').replace(/^"(.*)"$/, '$1');
    this.messagesChallenger.push({ role: 'assistant', content: res });
    const messageChallengee = `Challenger: "${res}"`;
    this.messagesChallengee.push({ role: 'user', content: messageChallengee });
    this.writeToStream('message-challenger', res);
  }

  private async sendCustomMessagesChallengee(): Promise<boolean> {
    let res = await this.openAi.postCompletionChat(this.messagesChallengee);
    res = res.replace(/^(Challenger: |Challengee: |Question: |Answer: )/, '').replace(/^"(.*)"$/, '$1');
    const hasUserQuestion = res.includes('<question>');

    if (hasUserQuestion) {
      const questionMatch = res.match(/<question>(.*?)<\/question>/);
      const questionWithTags = questionMatch[0];
      const question = questionMatch[1];
      const messageNoQuestion = res.replace(questionWithTags, '');

      if (messageNoQuestion) {
        this.messagesChallengee.push({ role: 'assistant', content: messageNoQuestion });
        this.writeToStream('message-challengee', messageNoQuestion);
      }

      this.writeToStream('question', question);
      const userInput = await firstValueFrom(this.userInput);

      const completeMessageQuestion = `Question: "${question}"
Answer: "${userInput}"`;

      this.messagesChallengee.push({ role: 'user', content: completeMessageQuestion });

      const completeMessageChallenger = `Prompt: "${this.prompt}"
Challengee: "${messageNoQuestion}"
Question: "${question}"
Answer: "${userInput}"`;

      this.messagesChallenger.push({ role: 'user', content: completeMessageChallenger });
      return true;
    } else {
      this.messagesChallengee.push({ role: 'assistant', content: res });

      const completeMessageChallenger = `Prompt: "${this.prompt}"
Challengee: "${res}"`;

      this.messagesChallenger.push({ role: 'user', content: completeMessageChallenger });
      this.writeToStream('message-challengee', res);
      return false;
    }
  }

  private async checkIfDone(): Promise<void> {
    const sysMsg = `Consider this experiment: Two instances of GPT-4, Challenger and Challengee are receiving an initial prompt from the user.
The Challengee's job is to answer and fulfill that prompt to the best of its abilities. The Challenger's job is to challenge the Challengee and make sure that the prompt is answered correctly and completely.
You are the evaluator who classifies if the Challenger accepted the Challengee's response completely. The only answers you know are "yes" and "no".`;

    const message = `The last message of the Challenger was:
"${this.messagesChallenger.at(-1).content}"
Does the Challenger accept the answer completely (100%) and has no further questions? Answer "yes" if the challenger is satisfied or "no" if not. Don't output anything but the string.`

    const messages = [
      { role: 'system', content: sysMsg },
      { role: 'user', content: message }
    ];

    const res = await this.openAi.postCompletionChat(messages);

    this.isDone = res.toLowerCase().replace(/\.|\s/g, '') === 'yes';
    if (this.isDone) this.writeToStream('done', '');
  }

  private writeToStream(type: string, data: string) {
    this.response.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  }
}
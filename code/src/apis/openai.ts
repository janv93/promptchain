import axios from 'axios';
import BaseController from '../base-controller';


export default class OpenAi extends BaseController {
  private baseUrl = 'https://api.openai.com/v1';

  // CAREFUL - high cost - set usage limits
  // gpt-3.5-turbo, gpt-4, gpt-4-32k
  // 0.002, 0.03-0.06, 0.06-0.12 $ per 1k tokens
  private model = 'gpt-3.5-turbo';

  private messages = [
    { role: 'system', content: 'You are an AI language model.' }
  ];

  private headers = {
    'Authorization': `Bearer ${process.env.openai_secret}`
  };

  public addChatMessage(content: string) {
    this.messages.push({ role: 'user', content });
  }

  public clearChatMessages() {
    this.messages = [
      { role: 'system', content: 'You are an AI language model.' }
    ];
  }

  // https://platform.openai.com/docs/api-reference/chat
  public async postCompletionChat(): Promise<string> {
    const url = this.baseUrl + '/chat/completions';

    const body = {
      model: this.model,
      messages: this.messages, // single string or array of strings
      max_tokens: 10, // max response tokens
      temperature: 0, // randomness, 0 = none, 2 = max
      top_p: 1, // alternative to temperature, filters output tokens by probability, 0.1 = only top 10% of tokens
      n: 1, // amount of responses/completions for 1 prompt
      stream: false, // real time stream
      presence_penalty: 2 // punishment for repeated tokens
    };

    try {
      console.log('POST ' + url);
      const res = await axios.post(url, body, { headers: this.headers });
      console.log(res.data);
      return res.data.choices[0].message.content;
    } catch (err) {
      this.handleError(err);
      return '';
    }
  }
}
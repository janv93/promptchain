import axios from 'axios';
import BaseController from '../base-controller';


export default class OpenAi extends BaseController {
  private baseUrl = 'https://api.openai.com/v1';

  // CAREFUL - high cost - set usage limits
  // completion: text-ada-001, text-babbage-001, text-curie-001, text-davinci-003
  // chat completion: gpt-3.5-turbo
  private model = 'gpt-3.5-turbo';

  private headers = {
    'Authorization': `Bearer ${process.env.openai_secret}`
  };

  // https://platform.openai.com/docs/api-reference/completions
  public async postCompletion(prompt: string): Promise<number> {
    const url = this.baseUrl + '/completions';

    const body = {
      model: this.model, // https://platform.openai.com/docs/models/gpt-3
      prompt,
      max_tokens: 10, // max response tokens
      temperature: 0, // randomness, 0 = none, 2 = max
      top_p: 1, // alternative to temperature, filters output tokens by probability, 0.1 = only top 10% of tokens
      n: 1, // amount of responses/completions for 1 prompt
      stream: false, // real time stream
    };

    try {
      console.log('POST ' + url);
      const res = await axios.post(url, body, { headers: this.headers });
      return res.data.choices[0].text;
    } catch (err) {
      this.handleError(err);
      return 0;
    }
  }

  // https://platform.openai.com/docs/api-reference/chat
  public async postCompletionChat(prompt: string): Promise<number> {
    const url = this.baseUrl + '/chat/completions';

    const messages = [
      { role: 'system', content: 'You are an AI language model.' },
      { role: 'user', content: prompt }
    ];

    const body = {
      model: this.model,
      messages, // single string or array of strings
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
      return res.data.choices[0].message.content;
    } catch (err) {
      this.handleError(err);
      return 0;
    }
  }
}
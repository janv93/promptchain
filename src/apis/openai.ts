import axios from 'axios';
import { encode } from 'gpt-3-encoder';

export default class OpenAi {
  // CAREFUL - high cost - set usage limits
  public model = 'gpt-3.5-turbo';
  public count = 0;
  public apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private tokenLimitGpt4 = 40000;
  private tokensGpt4Total = 0;
  private tokensGpt4 = 0;

  // https://platform.openai.com/docs/api-reference/chat
  public async postCompletionChat(messages: any[], retryCounter?: number, funcs?: any[], forceFunc?: string): Promise<any> {
    const url = this.baseUrl + '/chat/completions';
    const requestTokens = this.countTokens(JSON.stringify(messages) + (funcs ? JSON.stringify(funcs) : ''));

    let model = this.model;

    if (model === 'gpt-3.5-turbo' && requestTokens > 3000 && requestTokens < 15000) {
      model = 'gpt-3.5-turbo-16k';
    }

    if (model === 'gpt-4') {
      console.log(`${model} request: ${requestTokens} tokens, total gpt-4 tokens: ${this.tokensGpt4 + requestTokens}`);
    } else {
      console.log(`${model} request: ${requestTokens} tokens`);
    }

    const body = {
      model,
      messages, // single string or array of strings
      temperature: 0, // randomness, 0 = none, 2 = max
      top_p: 1, // alternative to temperature, filters output tokens by probability, 0.1 = only top 10% of tokens
      n: 1, // amount of responses/completions for 1 prompt
      stream: false, // real time stream
      presence_penalty: 2 // punishment for repeated tokens
    };

    if (funcs) {
      body['functions'] = funcs;
      if (forceFunc) {
        body['function_call'] = { name: forceFunc };
      }
    }

    const headers = {
      'Authorization': `Bearer ${this.apiKey || process.env.openai_secret}`
    };

    this.count++;

    try {
      if (this.model === 'gpt-4' && this.tokensGpt4 + requestTokens + 100 > this.tokenLimitGpt4) {
        console.log('Token limit reached. Waiting 1 minute.')
        await this.sleep(60000);
        this.tokensGpt4 = 0;
      }

      const res = (await axios.post(url, body, { headers: headers })).data;
      const message = res.choices[0].message;

      if (this.model === 'gpt-4') {
        this.tokensGpt4 += res.usage.total_tokens;
        this.tokensGpt4Total += res.usage.total_tokens;
      }

      return message.content ?? message.function_call;
    } catch (err) {
      if (retryCounter !== undefined) retryCounter++; else retryCounter = 0;
      this.handleError(err, retryCounter);
      return (retryCounter < 2) ? this.postCompletionChat(messages, retryCounter) : '';
    }
  }

  protected handleError(err: any, retryCounter: number) {
    console.error('/chat/completions ERR');
    console.error(`Retry no ${retryCounter + 1}`);

    if (err.response && err.response.data) {
      console.log(err.response.data);
    } else if (err.cause) {
      console.log(err.cause);
    } else {
      console.log(err);
    }
  }

  private countTokens(str: string) {
    return encode(str).length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
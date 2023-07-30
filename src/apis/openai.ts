import axios from 'axios';


export default class OpenAi {
  // CAREFUL - high cost - set usage limits
  // gpt-3.5-turbo, gpt-4, gpt-4-32k
  // 0.002, 0.03-0.06, 0.06-0.12 $ per 1k tokens
  public model = 'gpt-3.5-turbo';
  public count = 0;
  public apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  // https://platform.openai.com/docs/api-reference/chat
  public async postCompletionChat(messages: any[], retryCounter?: number): Promise<string> {
    console.log('POST completion');
    const url = this.baseUrl + '/chat/completions';

    const body = {
      model: this.model,
      messages, // single string or array of strings
      temperature: 0, // randomness, 0 = none, 2 = max
      top_p: 1, // alternative to temperature, filters output tokens by probability, 0.1 = only top 10% of tokens
      n: 1, // amount of responses/completions for 1 prompt
      stream: false, // real time stream
      presence_penalty: 2 // punishment for repeated tokens
    };

    this.count++;

    const headers = {
      'Authorization': `Bearer ${this.apiKey || process.env.openai_secret}`
    };

    try {
      const res = await axios.post(url, body, { headers: headers });
      const message = res.data.choices[0].message;
      return message.content;
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
}
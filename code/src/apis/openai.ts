import axios from 'axios';


export default class OpenAi {
  // CAREFUL - high cost - set usage limits
  // gpt-3.5-turbo, gpt-4, gpt-4-32k
  // 0.002, 0.03-0.06, 0.06-0.12 $ per 1k tokens
  public model = 'gpt-3.5-turbo';
  public count = 0;
  private baseUrl = 'https://api.openai.com/v1';

  private headers = {
    'Authorization': `Bearer ${process.env.openai_secret}`
  };

  // https://platform.openai.com/docs/api-reference/chat
  public async postCompletionChat(messages: any[], retryCounter?: number): Promise<string> {
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

    try {
      this.count++;
      const res = await axios.post(url, body, { headers: this.headers });
      const message = res.data.choices[0].message;
      return message.content;
    } catch (err) {
      if (retryCounter) retryCounter++; else retryCounter = 0;
      retryCounter = retryCounter ? retryCounter++ : 0;
      this.handleError(err);
      return (retryCounter < 2) ? this.postCompletionChat(messages, retryCounter) : '';
    }
  }

  protected handleError(err: any) {
    if (err.response && err.response.data) {
      console.log(err.response.data);
    } else {
      console.log(err);
    }
  }
}
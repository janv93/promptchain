# Autocoder

Takes a prompt and .zip file, changes code, sends back modified zip.

## Example

In [this](https://github.com/janv93/large-trading-api) repository, the prompt "In the Logger, add return types. In the Dca algo, add some comments" leads to this diff:\
https://github.com/janv93/large-trading-api/commit/73d177905944de959fc67d6e736ca5bd59f6cdfc

## How to use

1. npm start
2. Start Postman
3. Select POST @ localhost:3000/autocoder
4. Select body as form-data and add 3 keys: apiKey, prompt, zip (To append a file as value, hover key and select "File")
- apiKey - your OpenAI API key
- prompt - the change request
- zip - the code repository as a zip
5. Send request

## Cost

For [this](https://github.com/janv93/large-trading-api) repository the cost for small feature change is about 0.70$.\
Because of token limit, the agent may have to pause for a minute during the processing. Total run can take 30 seconds to 2 minutes.

## How it works

1. Creates a json abstraction of the repository as context for the model - contains the structure and descriptions of every file
2. Checks if files need renaming
3. Checks which files need a code change
4. Includes all the files and their content in one large request for GPT-4-turbo
5. Receives all code changes as plain text
6. Uses the model to split changes into segments for each file
7. Applies changes to each source file

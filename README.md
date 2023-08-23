# Promptchain
## Single/Multi agent LLM feedback loop architectures

The goal of this project is exploring different ideas found in the /ideas folder to make agents similar to AutoGPT/babyagi.
They are proofs of concept and not meant to become commercial products.

### ConversAItion

https://www.janv.dev/demo

Two agents, Challenger and Challengee talking to each other to fulfill a user prompt. Challenger challenges the Challengee by checking its reponses and asking for refinement. Challengee answers the prompt and can ask user for clarification. Uses a GET stream.

https://github.com/janv93/promptchain/assets/22982131/a88e7b88-0d37-409b-9869-b9bf1fd6c639

### BrainGPT
A feedback loop that implements chain of thought, summarization and eventually reflection. Currently extremely expensive (sometimes more than 10$ per run), but expense is necessary for best results. Waiting for API cost to decrease and speed to increase.

### Autocoder
Autonomously implements a change request in an existing code base. Currently limited to code changes and file renaming. Cost is medium, cents to few dollars.

## Other ideas

- Live voice transcription and summarization, see https://github.com/openai/whisper/discussions/2. Potentially live answering à la Google Duplex, using Elevenlabs for TTS.

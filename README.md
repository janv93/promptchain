# Promptchain
## Single agent LLM feedback loop models

The goal of this project is exploring different ideas found in the /ideas folder to make agents similar to AutoGPT/babyagi.

### BrainGPT
A feedback loop that implements chain of thought, summarization and eventually reflection. Currently extremely expensive (sometimes more than 10$ per run), but expense is necessary for best results. Waiting for API cost to decrease and speed to increase. Eventually will use streams instead of single call.

### ConversAItion

Two agents, Challenger and Challengee talking to each other to fulfill a user prompt. Challenger challenges the Challengee by checking its reponses and asking for refinement. Challengee answers the prompt and can ask user for clarification. Uses a GET stream.

### Autocoder
Idea is to autonomously get a feature or bugfix implemented. Already possible at very high cost (more calls to reduce probabilistic errors). Main difficulty will be writing generated code back to its corresponding file. Also files in repository should not be longer than 7500 tokens (GPT-4 token limit) because code should never be summarized. Except for that there should be no bigger challenges. Waiting for API cost to decrease.

## Other ideas

- Live voice transcription and summarization, see https://github.com/openai/whisper/discussions/2. Potentially live answering à la Google Duplex, using Elevenlabs for TTS.

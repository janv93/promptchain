import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import Communication from '../communication';
import { File } from '../interfaces';

export default class Autocoder extends Communication {
  private initialPrompt: string;
  private files: File[];

  constructor() {
    super();
    this.systemMessage = `You are an AI language model and coding expert.`;
  }

  public async chain(prompt: string, zip: any): Promise<string> {
    if (fs.existsSync('tmp')) {
      fs.rmSync('tmp', { recursive: true });
    }

    this.initialPrompt = prompt;
    await this.createRepo(zip);
    this.files = await this.loadFiles('tmp');
    this.filterFiles();
    this.getFileDependencies();
    await this.getDescriptions();
    const structure = this.createRepoStructure();
    const isLargeRepo = this.isLargeRepo();
    this.setModel(4);
    console.log(6)
    if (isLargeRepo) {
      await this.markRelevantFilesQuick(structure);
      this.files = this.files.filter(f => f.relevant);
      await this.markRelevantFilesFull(structure);
    } else {
      await this.markRelevantFilesFull(structure);
    }
    console.log(7)
    this.setModel(3.5);
    this.files = this.files.filter(f => f.relevant);
    const modifications = await this.getModifications(structure);
    console.log(8);
    console.log(modifications)
    await this.getModifiedFilesList(modifications, structure);
    console.log(9)
    await this.getSeparateModifications(modifications);
    console.log(10)
    await this.getModifiedFileContents();
    console.log(11)
    this.writeModifiedContents();
    return modifications;
  }

  private async createRepo(zip: any): Promise<void> {
    const buf = Buffer.from(zip.buffer);
    fs.mkdirSync('tmp');
    fs.writeFileSync('tmp/repo.zip', buf);
    const execPromisified = util.promisify(exec);
    await execPromisified('unzip -o tmp/repo.zip -d tmp');
    fs.unlinkSync('tmp/repo.zip');
  }

  private async loadFiles(directory: string): Promise<File[]> {
    const paths = await fs.promises.readdir(directory);

    const files: File[][] = await Promise.all(paths.map(async (relativePath) => {
      const fullPath = path.join(directory, relativePath);

      if (await this.isDirectory(fullPath)) {
        return this.loadFiles(fullPath);
      } else {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        return [{ path: fullPath, name: path.basename(fullPath), content }];
      }
    }));

    return files.flat();
  }

  private filterFiles() {
    this.files = this.files.filter((f: File) => {
      return f.name !== 'package-lock.json';
    });
  }

  private isLargeRepo(): boolean {
    const totalTokens = this.files.reduce((a, c) => a + this.countTokens(c.content), 0);
    return totalTokens > 20000;
  }

  private async isDirectory(path: string): Promise<boolean> {
    const stat = await fs.promises.stat(path);
    return stat.isDirectory();
  }

  private getFileDependencies(): void {
    this.files.forEach(f => {
      const dependencies = this.getDependencies(f.content);

      if (dependencies.length) {
        f.dependencies = dependencies;
      }
    });
  }

  private getDependencies(content: string): string[] {
    const regex = /(import\s+[\w*{}\s,]+\s+from\s+|require\()['"]([^"']+)["']\)?/g;
    let match;
    const result = [];

    while ((match = regex.exec(content)) !== null) {
      const dependency = match[2];

      if (dependency.startsWith('.') || dependency.startsWith('..')) {
        // get the file name without the extension
        const fileName = path.parse(dependency).name;
        result.push(fileName);
        continue;
      }

      try {
        if (require.resolve(dependency) !== path.resolve(dependency)) {
          continue;
        }
      } catch (e) {
        // not a built-in module or node_modules module, add the file name to the list
        const fileName = path.parse(dependency).name;
        result.push(fileName);
      }
    }

    return result;
  }

  private async getDescriptions(): Promise<any> {
    this.files = await Promise.all(this.files.map(async f => {
      f.description = await this.getDescription(f.content);
      return f;
    }));
  }

  private async getDescription(content: string): Promise<string> {
    const message = `START OF FILE\n${content}\nEND OF FILE\n\n
Provide a 2-3 sentences description of what the file with above content does. The description has to be complete and concise.`;

    const funcs = [{
      name: 'provide_description',
      description: 'Provide a description for a file',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The description of the file'
          }
        },
        required: ['description']
      }
    }];

    const forceFunc = 'provide_description';

    const res = await this.chatSingle(message, funcs, forceFunc);
    return JSON.parse(res.arguments).description;
  }

  private createRepoStructure(): string {
    const rootNode = {};

    for (const file of this.files) {
      let currentNode = rootNode;
      // Remove the root directory ("tmp") from the paths
      const paths = file.path.split('\\').slice(1);
      paths.forEach((path, index) => {
        if (!(path in currentNode)) {
          if (index === paths.length - 1) {
            const copy = { ...file };
            delete copy.path;
            delete copy.name;
            delete copy.content;
            currentNode[path] = copy;
          } else {
            currentNode[path] = {};
          }
        }

        if (index !== paths.length - 1) {
          currentNode = currentNode[path];
        }
      });
    }

    return JSON.stringify(rootNode);
  }

  private async markRelevantFilesQuick(structure: string): Promise<any> {
    const message = `The structure of a repository is given as following:\n${structure}\n
In order to fulfill the prompt "${this.initialPrompt}", you must select a list of files which are potentially relevant for this prompt.
Meaning they potentially need to be changed in order to fulfill the prompt. Each item in the array must have the notation [file name].[file extension]`;

    const funcs = [{
      name: 'set_relevant_files',
      description: 'Set the files that are relevant in order to fulfill the user prompt',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'The files which are relevant',
            items: {
              type: 'string'
            }
          }
        },
        required: ['files']
      }
    }];

    const forceFunc = 'set_relevant_files';
    const res = await this.chatSingle(message, funcs, forceFunc);
    const relevant: string[] = JSON.parse(res.arguments).files;

    this.files.forEach(f => {
      if (relevant.includes(f.name)) {
        f.relevant = true;
      }
    });
  }

  private async markRelevantFilesFull(structure: string): Promise<any> {
    this.files = await Promise.all(this.files.map(async f => {
      f.relevant = await this.isRelevant(f, structure);
      return f;
    }));
  }

  private async isRelevant(file: File, structure: string): Promise<boolean> {
    const message = `The structure of a repository is given as following:\n${structure}\n
We consider one file at a time. Consider the content of the current file  ${file.name}:\nSTART OF FILE\n${file.content}\nEND OF FILE
Is it necessary to do code changes in this file in order to fulfill the user prompt "${this.initialPrompt}"? If it is sufficient to do the change in other files, don't flag it.`;

    const funcs = [{
      name: 'needs_change',
      description: 'Flag the current file if it needs to be modified or not',
      parameters: {
        type: 'object',
        properties: {
          change: {
            type: 'boolean',
            description: `If the current file ${file.name} needs to be changed in order to fulfill the user request`
          }
        },
        required: ['change']
      }
    }];

    const forceFunc = 'needs_change';
    const res = await this.chatSingle(message, funcs, forceFunc);
    return JSON.parse(res.arguments).change;
  }

  private async getModifications(structure: string): Promise<string> {
    const message = `The following user request is given: "${this.initialPrompt}"
The structure of a repository is given as following:\n${structure}\n
The contents of the relevant files are as follows:
${this.createFileContentSummaries(this.files)}
Output all the changes required in order to fulfill the request "${this.initialPrompt}". Don't output pseudocode, output all code that is changed, no missing parts. Only output the code changes in the format: [name of file]\n[changes]`;

    return this.chatSingle(message);
  }

  private createFileContentSummaries(files: File[]): string {
    return files.reduce((summary, f) => summary + `\n---${f.name} start---\n${f.content}\n---${f.name} end---\n\n`, '');
  }

  private async getModifiedFilesList(modifications: string, structure: string): Promise<any> {
    const message = `The structure of a repository is given as following:\n${structure}\n
In order to fulfill the prompt "${this.initialPrompt}" the following changes were proposed:\n---changes start---\n${modifications}\n---changes end---
Call set_modified_files() with an array of all modified files. Each file needs to have the notation [file name].[file extension]`;

    const funcs = [{
      name: 'set_modified_files',
      description: 'Set the files that were modified',
      parameters: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            description: 'The files whose code was changed',
            items: {
              type: 'string'
            }
          }
        },
        required: ['files']
      }
    }];

    const forceFunc = 'set_modified_files';
    const res = await this.chatSingle(message, funcs, forceFunc);
    const modifiedFiles = JSON.parse(res.arguments).files;
    console.log(modifiedFiles)
console.log(this.files.length, 'asd')
    this.files.forEach(f => {
      if (modifiedFiles.includes(f.name)) {
        f.modified = true;
      }
    });
  }

  private async getSeparateModifications(modifications: string): Promise<any> {
    this.files = this.files.filter(f => f.modified);
    this.setModel(4);
    this.files = await Promise.all(this.files.map(f => this.getSeparateModification(f, modifications)));
    this.setModel(3.5);
  }

  private async getSeparateModification(file: File, modifications): Promise<File> {
    const message = `In order to fulfill the user prompt "${this.initialPrompt}", the following modifications need to be done:\n---changes start---\n${modifications}\n---changes end---
Extract the modifications for ${file.name} 1:1 from the above text. Only extract the modifications for this file and ignore the other files.`;

    const funcs = [{
      name: 'set_extracted_modification',
      description: `Extract the modifications for ${file.name}`,
      parameters: {
        type: 'object',
        properties: {
          modifications: {
            type: 'string',
            description: `The modifications for ${file.name}`
          }
        },
        required: ['modifications']
      }
    }];

    const forceFunc = 'set_extracted_modification';
    const res = await this.chatSingle(message, funcs, forceFunc);
    file.modification = JSON.parse(res.arguments).modifications;
    console.log(1, file.name);
    console.log(file.modification)
    console.log(2)
    return file;
  }

  private async getModifiedFileContents(): Promise<any> {
    this.setModel(4);
    this.files = await Promise.all(this.files.map(f => this.getModifiedFileContent(f)));
    this.setModel(3.5);
  }

  private async getModifiedFileContent(file: File): Promise<File> {
    const message = `---${file.name} start---\n${file.content}\n---${file.name} end---\n\n
---changes start---${file.modification}---changes end---
Integrate these changes in the file above and write the new content of the entire file, meaning every line.`;

    const funcs = [{
      name: 'write_modified_file_content',
      description: `Write the modified file content`,
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: `The content of the modified file`
          }
        },
        required: ['content']
      }
    }];

    const forceFunc = 'write_modified_file_content';
    const res = await this.chatSingle(message, funcs, forceFunc);
    file.modifiedContent = JSON.parse(res.arguments).content;
    console.log(3, file.name);
    console.log(file.modifiedContent)
    console.log(4)
    return file;
  }

  private writeModifiedContents() {
    this.files.forEach(f => {
      try {
        fs.writeFileSync(f.path, f.modifiedContent, 'utf8');
      } catch (err) {
        console.error(`Error writing to file: ${err}`);
      }
    });
  }
}
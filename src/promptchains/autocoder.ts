import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import Communication from '../communication';
import { File } from '../interfaces';

export default class Autocoder extends Communication {
  private initialPrompt: string;

  constructor() {
    super();
    this.systemMessage = `You are an AI language model and coding expert.`;
  }

  public async chain(prompt: string, zip: any): Promise<void> {
    this.initialPrompt = prompt;
    await this.createRepo(zip);
    let files = await this.loadFiles('tmp');
    this.getFileDependencies(files);
    files = await this.getDescriptions(files);
    const json = this.createRepoJson(files);
    this.setModel(4);
    files = await this.markRelevantFiles(files, json);
    this.setModel(3.5);
    const relevant = files.filter(f => f.relevant);
    fs.rmSync('tmp', { recursive: true });
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

  private async isDirectory(path: string): Promise<boolean> {
    const stat = await fs.promises.stat(path);
    return stat.isDirectory();
  }

  private getFileDependencies(files: File[]): void {
    files.forEach(f => {
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

  private async getDescriptions(files: File[]): Promise<File[]> {
    return Promise.all(files.map(async f => {
      f.description = await this.getDescription(f.content);
      return f;
    }));
  }

  private async getDescription(content: string): Promise<string> {
    const message = `File content:\n\n${content}\n\nFile content end
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

  private createRepoJson(files: File[]): string {
    const rootNode = {};

    for (const file of files) {
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

  private async markRelevantFiles(files: File[], structure: string): Promise<File[]> {
    return Promise.all(files.map(async f => {
      f.relevant = await this.isRelevant(f, structure);
      console.log(f.name, f.relevant)
      return f;
    }));
  }

  private async isRelevant(file: File, structure: string): Promise<boolean> {
    const message = `The structure of a repository is given as following:\n${structure}\n
We consider one file at a time. Consider the content of the current file  ${file.name}:\nSTART OF FILE\n${file.content}\nEND OF FILE
Is it necessary to do code changes in this file in order to fulfill the user prompt "${this.initialPrompt}"?`;

    const funcs = [{
      name: 'needs_change',
      description: 'Flag the current file if it needs to be modified or not',
      parameters: {
        type: 'object',
        properties: {
          change: {
            type: 'boolean',
            description: 'If the current file needs to be changed in order to fulfill the user request'
          }
        },
        required: ['change']
      }
    }];

    const forceFunc = 'needs_change';
    const res = await this.chatSingle(message, funcs, forceFunc);
    return JSON.parse(res.arguments).change;
  }
}
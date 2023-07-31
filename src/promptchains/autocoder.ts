import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import Communication from '../communication';
import { File } from '../interfaces';

export default class Autocoder extends Communication {
  constructor() {
    super();
    this.systemMessage = `You are an AI language model and coding expert.`;
  }

  public async chain(prompt: string, zip: any): Promise<void> {
    await this.createRepo(zip);
    let files = await this.loadFiles('tmp');
    files.forEach(f => f.dependencies = this.getDependencies(f.content));
    files = await this.getDescriptions(files);
    files.forEach(f => console.log(f.path, f.description))
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
        return [{ path: fullPath, content }];
      }
    }));

    return files.flat();
  }

  private async isDirectory(path: string): Promise<boolean> {
    const stat = await fs.promises.stat(path);
    return stat.isDirectory();
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
Provide a 2-3 sentences description of what the file with above content does. The description has to be complete and concise.
Output only the description
`;

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
}
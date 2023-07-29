import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import Communication from '../communication';
import { File } from '../interfaces';


export default class Autocoder extends Communication {
  constructor() {
    super();
  }

  public async chain(prompt: string, zip: any): Promise<void> {
    await this.createRepo(zip);
    const files = await this.loadFiles('tmp');
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
}
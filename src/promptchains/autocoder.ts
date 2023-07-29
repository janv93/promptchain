import Communication from '../communication';
import * as fs from 'fs';
import { exec } from 'child_process';
import util from 'util';


export default class Autocoder extends Communication {
  constructor() {
    super();
  }

  public async chain(prompt: string, zip: any): Promise<void> {
    const buf = Buffer.from(zip.buffer);
    fs.mkdirSync('tmp');
    fs.writeFileSync('tmp/repo.zip', buf);
    const execPromisified = util.promisify(exec);
    await execPromisified('unzip -o tmp/repo.zip -d tmp');
  }
}
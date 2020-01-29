import {promises as fs} from 'fs';
import * as core from '@actions/core';
import {exec} from '@actions/exec';

async function isDir(path: string): Promise<boolean> {
  return fs.stat(path).then(
    (s) => s.isDirectory(),
    () => false
  );
}

async function isFile(path: string): Promise<boolean> {
  return fs.stat(path).then(
    (s) => s.isFile(),
    () => false
  );
}

const fixUrl = (url: string): string =>
  `//${url.replace(/^\/*/, '').replace(/\/*$/, '')}/`;

async function run(): Promise<void> {
  const dir = core.getInput('dir');
  if (dir) {
    process.chdir(dir);
  }

  const npmUrl = core.getInput('npmurl');
  if (!npmUrl) {
    core.setFailed("'npmurl' must be set");
    return;
  }

  const npmToken = core.getInput('token');

  if (!npmToken) {
    core.setFailed("'token' input not set");
    return;
  }

  const isPublic = (core.getInput('public') ?? '').toString() === 'true';

  const packageFile = './package.json';
  const pkg = JSON.parse((await fs.readFile(packageFile)).toString());
  if (!pkg.name.match(/^@tv4-media\//)) {
    core.setFailed('Cannot publish packages outside @tv4-media scope');
    return;
  }

  if (Boolean(pkg.private) === isPublic) {
    core.setFailed(
      `'public' input parameter (${isPublic}) and package.json 'private' parameter (${Boolean(pkg.private)}) mismatch`
    );
    return;
  }

  await exec(`npm config set @tv4-media:registry https:${fixUrl(npmUrl)}`);
  await exec(`npm config set '${fixUrl(npmUrl)}:_authToken' '${npmToken}'`);

  await exec('npm whoami');

  /* check if the deps where installed in a previous step */
  const isInstalled = await isDir('node_modules');

  if (!isInstalled) {
    if (await isFile('package-lock.json')) {
      await exec('npm ci');
    } else {
      await exec('npm install');
    }
  }

  await exec('npm publish');
}

run().catch((error) => {
  console.error('Action failed', error);
  core.setFailed(error.message);
});

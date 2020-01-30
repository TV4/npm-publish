import {promises as fs} from 'fs';
import path from 'path';
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
    console.log(`Changing into ${dir}`);
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

  const packageFile = './package.json';
  const pkg = JSON.parse((await fs.readFile(packageFile)).toString());
  if (!pkg.name.match(/^@tv4\//)) {
    core.setFailed('Cannot publish packages outside @tv4 scope');
    return;
  }

  const fixedNpmUrl = fixUrl(npmUrl);

  await fs.writeFile(
    '.npmrc',
    `registry=https://registry.npmjs.org/\n@tv4:registry=https:${fixedNpmUrl}\n${fixedNpmUrl}:_authToken=${npmToken}`
  );

  /* ensure access to GPR */
  await exec(`npm whoami --registry https:${fixedNpmUrl}`);

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

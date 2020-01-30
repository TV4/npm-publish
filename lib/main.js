"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const core = __importStar(require("@actions/core"));
const exec_1 = require("@actions/exec");
function isDir(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.promises.stat(path).then((s) => s.isDirectory(), () => false);
    });
}
function isFile(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return fs_1.promises.stat(path).then((s) => s.isFile(), () => false);
    });
}
const fixUrl = (url) => `//${url.replace(/^\/*/, '').replace(/\/*$/, '')}/`;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
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
        const pkg = JSON.parse((yield fs_1.promises.readFile(packageFile)).toString());
        if (!pkg.name.match(/^@tv4\//)) {
            core.setFailed('Cannot publish packages outside @tv4 scope');
            return;
        }
        const fixedNpmUrl = fixUrl(npmUrl);
        yield fs_1.promises.writeFile('.npmrc', `registry=https://registry.npmjs.org/\n@tv4:registry=https:${fixedNpmUrl}\n${fixedNpmUrl}:_authToken=${npmToken}`);
        /* ensure access to GPR */
        yield exec_1.exec(`npm whoami --registry https:${fixedNpmUrl}`);
        /* check if the deps where installed in a previous step */
        const isInstalled = yield isDir('node_modules');
        if (!isInstalled) {
            if (yield isFile('package-lock.json')) {
                yield exec_1.exec('npm ci');
            }
            else {
                yield exec_1.exec('npm install');
            }
        }
        yield exec_1.exec('npm publish');
    });
}
run().catch((error) => {
    console.error('Action failed', error);
    core.setFailed(error.message);
});

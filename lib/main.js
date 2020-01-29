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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const path_1 = __importDefault(require("path"));
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
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.join(process.env.HOME || '~', (_a = core.getInput('dir'), (_a !== null && _a !== void 0 ? _a : '')));
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
        const isPublic = (_b = core.getInput('public'), (_b !== null && _b !== void 0 ? _b : '')).toString() === 'true';
        const packageFile = './package.json';
        const pkg = JSON.parse((yield fs_1.promises.readFile(packageFile)).toString());
        if (!pkg.name.match(/^@tv4-media\//)) {
            core.setFailed('Cannot publish packages outside @tv4-media scope');
            return;
        }
        if (Boolean(pkg.private) === isPublic) {
            core.setFailed(`'public' input parameter (${isPublic}) and package.json 'private' parameter (${Boolean(pkg.private)}) mismatch`);
            return;
        }
        yield fs_1.promises.writeFile(path_1.default.join(process.env.HOME || '~', '.npmrc'), `registry=https://registry.npmjs.org/\n@tv4-media:registry=https:${fixUrl(npmUrl)}\n${fixUrl(npmUrl)}:_authToken=${npmToken}`);
        yield exec_1.exec('pwd');
        yield exec_1.exec('env');
        yield exec_1.exec('cat .npmrc');
        yield exec_1.exec(`npm whoami --registry https:${fixUrl(npmUrl)}`);
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

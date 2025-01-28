#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const command_line_args_1 = __importDefault(require("command-line-args"));
const init_1 = require("./init");
const fs_1 = __importDefault(require("fs"));
const environmentDir = './.env/provider/';
const inquirer_1 = __importDefault(require("inquirer"));
const debugenv_1 = __importDefault(require("./debugenv"));
inquirer_1.default.registerPrompt('directory', require('inquirer-directory'));
const optionDefinitions = [
    { name: 'init', alias: 'i', type: Boolean },
    { name: 'name', type: String, multiple: false, defaultOption: true }
];
start();
async function start() {
    const options = (0, command_line_args_1.default)(optionDefinitions);
    if (options.init) {
        // if there is no settings.json file
        const filename = `${environmentDir}/settings.json`;
        if (!fs_1.default.existsSync(filename)) {
            // specify where the default-*.json files needs to be copied.
            let paths = [];
            let morePaths = true;
            while (morePaths) {
                const { path, more } = await inquirerDestinationPath();
                paths.push(`./${path}`);
                morePaths = more;
            }
            // write settings.json
            if (!fs_1.default.existsSync(environmentDir)) {
                fs_1.default.mkdirSync(environmentDir, { recursive: true });
            }
            fs_1.default.writeFile(filename, JSON.stringify({ destination: paths, configurations: environmentDir }, null, 2), 'utf8', (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }
        const appName = options.name || await inquirerName();
        // set the init options  
        await (0, init_1.init)(appName, environmentDir);
    }
    else {
        const settingsStr = fs_1.default.readFileSync(`${environmentDir}/settings.json`, 'utf8');
        const settings = JSON.parse(settingsStr);
        // Question developer to get the correct default-*.json files
        await (0, debugenv_1.default)(settings);
    }
}
async function inquirerName() {
    return (await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'appname',
            message: "Enter the name of the application",
        },
    ])).appname;
}
async function inquirerDestinationPath() {
    return inquirer_1.default.prompt([
        {
            type: "directory",
            name: "path",
            message: "Where do you want to copy the default-*.json files?",
            basePath: "."
        }, {
            type: 'confirm',
            message: 'would you like to add another path?',
            name: 'more',
            default: true
        }
    ]);
}

#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import { init } from './init';
import fs from 'fs';

const environmentDir = './.env/provider/'

import inquirer from 'inquirer';
import debugenv, { IDebugEnvSettings } from './debugenv';

inquirer.registerPrompt('filePath', require('inquirer-file-path'));
inquirer.registerPrompt('directory', require('inquirer-directory'));

const optionDefinitions = [
    { name: 'init', alias: 'i', type: Boolean },
    { name: 'name', type: String, multiple: false, defaultOption: true }
]

start();

async function start() {
    const options = commandLineArgs(optionDefinitions);

    if (options.init) {

        // if there is no settings.json file
        const filename = `${environmentDir}/settings.json`;
        if (!fs.existsSync(filename)) {
            // specify where the default-*.json files needs to be copied.
            let paths: string[] = [];
            let morePaths = true;

            while (morePaths) {
                const { path, more } = await inquirerDestinationPath();
                paths.push(`./${path}`);
                morePaths = more;
            }

            // write settings.json
            if (!fs.existsSync(environmentDir)) {
                fs.mkdirSync(environmentDir, { recursive: true });
            }

            fs.writeFile(filename, JSON.stringify({ destination: paths, configurations: environmentDir }, null, 2), 'utf8', (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }

        const appName = options.name || await inquirerName();
        // set the init options  
        await init(appName, environmentDir);

    } else {
        const settingsStr = fs.readFileSync(`${environmentDir}/settings.json`, 'utf8');
        const settings: IDebugEnvSettings = JSON.parse(settingsStr);

        // Question developer to get the correct default-*.json files
        await debugenv(settings);
    }
}

async function inquirerName() {
    return (await inquirer.prompt([
        {
            type: 'input',
            name: 'appname',
            message: "Enter the name of the application",
        },
    ])).appname;
}

async function inquirerDestinationPath(): Promise<{ path: string[], more: boolean }> {
    return inquirer.prompt([
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
        }])
}


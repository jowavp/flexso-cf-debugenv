"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = debugenv;
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
const consumerTenants_1 = require("./consumerTenants");
async function debugenv(settings) {
    //
    const files = fs_1.default.readdirSync(settings.configurations)
        .filter(f => f.endsWith('.json') && f !== 'settings.json');
    console.log('-------------- Configure debug environment for this application -------------- ');
    const provider = (await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'providerConfig',
            message: 'Select your provider configuration?',
            choices: files.map(f => ({
                name: f.replace('.json', ''),
                value: f
            })),
            filter(val) {
                return val.toUpperCase();
            }
        }
    ])).providerConfig;
    const fileData = fs_1.default.readFileSync(`${settings.configurations}/${provider}`, 'utf8');
    // set to JSON
    const template = JSON.parse(fileData);
    const saasCredentials = template.VCAP_SERVICES?.["saas-registry"]?.[0].credentials;
    const isSaas = !!saasCredentials;
    let consumer = provider;
    if (saasCredentials) {
        const consumerNames = await (0, consumerTenants_1.getSubscribedTenantNames)(saasCredentials);
        consumer = (await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'consumer',
                message: 'Select the consumer',
                choices: consumerNames
            },
        ])).consumer;
    }
    const { defaultServices, defaultEnv } = convertDefaultServicesJson(template, consumer, isSaas);
    // write file to destination
    console.log(`-------------- Writing files to debug on tenant ${consumer} --------------`);
    for (let destDir of settings.destination) {
        fs_1.default.writeFile(`${destDir}/default-services.json`, defaultServices, 'utf8', (err) => {
            if (err) {
                console.log(`Error writing file: ${err}`);
            }
            else {
                console.log(`File ${destDir}/default-services.json is written successfully!`);
            }
        });
        fs_1.default.writeFile(`${destDir}/default-env.json`, defaultEnv, 'utf8', (err) => {
            if (err) {
                console.log(`Error writing file: ${err}`);
            }
            else {
                console.log(`File ${destDir}/default-env.json is written successfully!`);
            }
        });
    }
}
function convertDefaultServicesJson(template, consumer, isSaas) {
    template.VCAP_SERVICES.uaa = [].concat(template.VCAP_SERVICES.xsuaa);
    if (template?.VCAP_SERVICES?.xsuaa && isSaas) {
        template.VCAP_SERVICES.xsuaa.map((xsuaa) => {
            const newConsumer = consumer || xsuaa.credentials.identityzone;
            xsuaa.credentials.identityzone = newConsumer;
            xsuaa.credentials.tenantmode = "dedicated";
            xsuaa.credentials.url = `https://${newConsumer}.${xsuaa.credentials.uaadomain}`;
            return xsuaa;
        });
    }
    const defaultEnv = JSON.stringify(template, null, 2);
    const defaultServices = JSON.stringify(Object.fromEntries(Object.entries(template.VCAP_SERVICES).map(([k, v]) => [k, v[0].credentials])), null, 2);
    return {
        defaultEnv,
        defaultServices
    };
}


import inquirer from 'inquirer';
import fs from 'fs';
import { getSubscribedTenantNames } from './consumerTenants';

export default async function debugenv(settings: IDebugEnvSettings) {


    //
    const files = fs.readdirSync(settings.configurations)
        .filter(f => f.endsWith('.json') && f !== 'settings.json')

    console.log('-------------- Configure debug environment for this application -------------- ');
    const provider: string = (await inquirer.prompt([
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

    const fileData = fs.readFileSync(`${settings.configurations}/${provider}`, 'utf8');
    // set to JSON
    const template = JSON.parse(fileData);
    const saasCredentials = template.VCAP_SERVICES?.["saas-registry"]?.[0].credentials;

    const consumerNames = await getSubscribedTenantNames(saasCredentials);

    const consumer = (await inquirer.prompt([
        {
            type: 'list',
            name: 'consumer',
            message: 'Select the consumer',
            choices: consumerNames
        },
    ])).consumer;

    const { defaultServices, defaultEnv } = convertDefaultServicesJson(template, consumer)

    // write file to destination
    console.log(`-------------- Writing files to debug on tenant ${consumer} --------------`);
    for (let destDir of settings.destination) {
        fs.writeFile(`${destDir}/default-services.json`, defaultServices, 'utf8', (err) => {
            if (err) {
                console.log(`Error writing file: ${err}`);
            } else {
                console.log(`File ${destDir}/default-services.json is written successfully!`);
            }
        });
        fs.writeFile(`${destDir}/default-env.json`, defaultEnv, 'utf8', (err) => {
            if (err) {
                console.log(`Error writing file: ${err}`);
            } else {
                console.log(`File ${destDir}/default-env.json is written successfully!`);
            }
        });
    }

}

function convertDefaultServicesJson(template: { VCAP_SERVICES: { [key: string]: any } }, consumer: string) {

    template.VCAP_SERVICES.uaa = [].concat(template.VCAP_SERVICES.xsuaa);

    if (template?.VCAP_SERVICES?.xsuaa) {
        template.VCAP_SERVICES.xsuaa.map(
            (xsuaa: any) => {
                const newConsumer = consumer || xsuaa.credentials.identityzone;
                xsuaa.credentials.identityzone = newConsumer;
                xsuaa.credentials.tenantmode = "dedicated";
                xsuaa.credentials.url = `https://${newConsumer}.${xsuaa.credentials.uaadomain}`

                return xsuaa
            }
        )
    }

    const defaultEnv = JSON.stringify(template, null, 2);
    const defaultServices = JSON.stringify(Object.fromEntries(Object.entries(template.VCAP_SERVICES).map(([k, v]) => [k, v[0].credentials])), null, 2);

    return {
        defaultEnv,
        defaultServices
    }
}

export interface IDebugEnvSettings { destination: string[], configurations: string }
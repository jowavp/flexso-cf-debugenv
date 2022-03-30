"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
// init the debug environment
async function init(appname, environmentDir) {
    const [token, baseURL] = await Promise.all([getCFOauthToken(), getCFApiUrl()]);
    if (!baseURL) {
        throw 'Unable to get CF API URL';
    }
    // Get all apps with the given name
    const appsResponse = await axios_1.default.get('/v3/apps', {
        baseURL,
        params: {
            per_page: 5000,
            names: appname
        },
        headers: { authorization: token }
    });
    const spacesResponse = await Promise.all(appsResponse.data?.resources.map(app => axios_1.default.get(app.links.space.href, { headers: { authorization: token } })));
    const spaces = spacesResponse.map(r => r.data);
    const orgResponse = await Promise.all(spaces.map(s => axios_1.default.get(s.links.organization.href, { headers: { authorization: token } })));
    const orgs = orgResponse.map(r => r.data);
    const apps = appsResponse.data?.resources;
    const OrgSpaceApp = apps.map((a, i) => {
        return {
            guid: a.guid,
            app: a,
            space: spaces[i].name,
            org: orgs[i].name
        };
    });
    const { appSelection } = await getAppSelection(OrgSpaceApp);
    const app = apps.find(a => a.guid === appSelection);
    const osa = OrgSpaceApp.find(a => a.guid === appSelection);
    if (!app || !osa) {
        throw `app ${appSelection} not found in cloud foundry.`;
    }
    const envResponse = await axios_1.default.get(`/v3/apps/${app.guid}/env`, { baseURL, headers: { authorization: token } });
    const env = envResponse.data;
    const defaultServices = env.system_env_json;
    defaultServices.destinations = [
        {
            "forwardAuthToken": true,
            "name": "srv_api",
            "strictSSL": false,
            "url": "http://localhost:3002",
            "timeout": 1200000
        }
    ];
    // create debug key entries for all services.
    const serviceGuidsAndNames = Object.values(defaultServices.VCAP_SERVICES).flatMap((service) => service.map(o => ({ guid: o.instance_guid, name: o.instance_name, label: o.label }))).filter(si => si.label !== 'application-logs');
    const serviceGuids = serviceGuidsAndNames.map(o => o.guid);
    let keyResponse = await axios_1.default.get(`/v3/service_credential_bindings`, {
        baseURL,
        headers: { authorization: token },
        params: {
            names: 'debug',
            type: "key",
            service_instance_guids: serviceGuids.join(',')
        }
    });
    let existingKeys = keyResponse.data.resources;
    const existingKeysForServiceGuids = existingKeys.map(k => k.relationships.service_instance.data.guid);
    const servicesGuidsWithoutDebugKey = serviceGuids.filter(s => !existingKeysForServiceGuids.includes(s));
    const ServicesToCreateKeys = serviceGuidsAndNames.filter(s => servicesGuidsWithoutDebugKey.includes(s.guid)).map(s => s.name);
    // volgende code probeert de debug keys aan te maken. Daarna lezen we opnieuw alle keys uit
    if (servicesGuidsWithoutDebugKey.length > 0) {
        console.log(`${existingKeys.length} debug keys found, We try to create ${servicesGuidsWithoutDebugKey.length} new debug keys for: ${ServicesToCreateKeys.join(', ')}`);
        try {
            const newKeysResponse = await Promise.allSettled(servicesGuidsWithoutDebugKey.map(serviceKey => axios_1.default.post('/v3/service_credential_bindings', {
                "type": "key",
                "name": "debug",
                "relationships": {
                    "service_instance": {
                        "data": {
                            "guid": serviceKey
                        }
                    }
                }
            }, {
                baseURL,
                method: 'POST',
                headers: { authorization: token, "Content-type": "application/json" }
            })));
            console.log('new keys created');
            keyResponse = await axios_1.default.get(`/v3/service_credential_bindings`, {
                baseURL,
                headers: { authorization: token },
                params: {
                    names: 'debug',
                    type: "key",
                    service_instance_guids: serviceGuids.join(',')
                }
            });
            existingKeys = keyResponse.data.resources;
        }
        catch (error) {
            console.log(error);
        }
    }
    const keyDetailsProm = (await Promise.allSettled(existingKeys.map(key => axios_1.default.get(key.links.details.href, { headers: { authorization: token } })))).filter(kdp => kdp.status === "fulfilled");
    const keyDetails = keyDetailsProm.map(kdp => kdp.value.data.credentials);
    // vervang de credentials in de file door de credentials van de debug keys. Als de app dan gedeployed wordt, dan wijzigen deze credentials niet. Keys via app assignments wijzigen wel.
    Object.values(defaultServices.VCAP_SERVICES).forEach(services => {
        services.forEach(service => {
            // check in the debug keys and replace credentials object
            const { instance_guid } = service;
            const index = existingKeys.findIndex(ek => ek.relationships.service_instance.data.guid === instance_guid);
            if (keyDetails[index]) {
                service.credentials = keyDetails[index];
                service.debugkey = true;
            }
        });
    });
    // write json file to provider folder
    if (!fs_1.default.existsSync(environmentDir)) {
        fs_1.default.mkdirSync(environmentDir, { recursive: true });
    }
    const filename = `${environmentDir}/${osa.org}.json`;
    fs_1.default.writeFile(filename, JSON.stringify(defaultServices, null, 2), 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        }
        else {
            console.log(`File ${filename} is written successfully!`);
        }
    });
}
exports.init = init;
async function getAppSelection(OrgSpaceApp) {
    return inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'appSelection',
            message: 'Select your provider configuration?',
            choices: OrgSpaceApp.map(val => {
                return {
                    name: `${val.org} - ${val.space} - ${val.app.name}`,
                    value: val.guid,
                    short: `${val.org} - ${val.space} - ${val.app.name}`
                };
            })
        }
    ]);
}
async function getCFOauthToken() {
    return new Promise((resolve, reject) => {
        const tokenCmd = child_process_1.spawn('cf', ['oauth-token']);
        tokenCmd.stdout.on('data', (data) => {
            if (data.toString().startsWith('bearer')) {
                const token = data.toString().trim();
                resolve(token);
            }
            else {
                reject(`Not logged in. Use 'cf login' or 'cf login --sso' to log in.`);
            }
        });
        tokenCmd.stderr.on('error', (data) => {
            reject(`Not logged in. Use 'cf login' or 'cf login --sso' to log in.`);
        });
    });
}
async function getCFApiUrl() {
    return new Promise((resolve, reject) => {
        const apiURLCmd = child_process_1.spawn('cf', ['api']);
        apiURLCmd.stdout.on('data', (data) => {
            const regex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gm;
            const result = regex.exec(data.toString());
            if (result) {
                resolve(result[0]);
            }
            reject(`Unable to read the api url.`);
            /*
            const value = Object.fromEntries(
                (<string>(data.toString())).split('\n').filter(line => line).map(line => {
                    const [key, ...rest] = line.split(':')
                    const value = rest.join(':')
                    return [key.trim(), value.trim()];
                })
            );

            const baseURL: string = value['API endpoint'];
            resolve(baseURL)
            */
        });
        apiURLCmd.stderr.on('error', (data) => {
            reject(`Unable to read the api url.`);
        });
    });
}

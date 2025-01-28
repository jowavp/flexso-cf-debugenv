"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscribedTenantNames = getSubscribedTenantNames;
const axios_1 = __importDefault(require("axios"));
async function getSubscribedTenantNames(epaasService) {
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', epaasService.clientid);
        const url = `${epaasService.url}/oauth/token`;
        const tokenResponse = await axios_1.default.post(url, params, {
            auth: {
                username: epaasService.clientid,
                password: epaasService.clientsecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const token = tokenResponse.data;
        const authorization = `${token.token_type} ${token.access_token}`;
        const subscriptionUrl = `${epaasService.saas_registry_url}/saas-manager/v1/application/subscriptions`;
        const subscriptionResponse = await axios_1.default.get(subscriptionUrl, {
            headers: { authorization }
        });
        const subscriptions = subscriptionResponse.data.subscriptions;
        return subscriptions.map(s => s.subdomain);
    }
    catch (e) {
        throw e;
    }
}

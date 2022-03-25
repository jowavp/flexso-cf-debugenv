
import axios from 'axios';

export async function getSubscribedTenantNames(epaasService: any) {
    try {
        const params = new URLSearchParams()
        params.append('grant_type', 'client_credentials')
        params.append('client_id', epaasService.clientid)

        const url = `${epaasService.url}/oauth/token`


        const tokenResponse = await axios.post(url, params, {
            auth: {
                username: epaasService.clientid,
                password: epaasService.clientsecret
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const token = tokenResponse.data;

        const authorization = `${token.token_type} ${token.access_token}`
        const subscriptionUrl = `${epaasService.saas_registry_url}/saas-manager/v1/application/subscriptions`;

        const subscriptionResponse = await axios.get<{ subscriptions: { subdomain: string }[] }>(subscriptionUrl, {
            headers: { authorization }
        });

        const subscriptions = subscriptionResponse.data.subscriptions;

        return subscriptions.map(s => s.subdomain);
    } catch (e) {
        throw e;
    }

}
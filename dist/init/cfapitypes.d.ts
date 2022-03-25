export interface ICfApiResponse<T> {
    pagination: ICfApiPagination;
    resources: T[];
}
interface ICfApiPagination {
    total_results: number;
    total_pages: number;
    first: ICfApiHref;
    last: ICfApiHref;
    next: ICfApiHref;
    previous: ICfApiHref;
}
interface ICfApiHref {
    href: string;
    method?: string;
}
interface ICfApiRelation {
    data: {
        guid: string;
    };
}
export interface ICfApiApp extends ICFApiObject {
    "state": string;
    "lifecycle": {
        "type": string;
        "data": {
            "buildpacks": string[];
            "stack": string;
        };
    };
    "relationships": {
        "space": ICfApiRelation;
    };
    "links": {
        "self": ICfApiHref;
        "space": ICfApiHref;
        "processes": ICfApiHref;
        "packages": ICfApiHref;
        "environment_variables": ICfApiHref;
        "current_droplet": ICfApiHref;
        "droplets": ICfApiHref;
        "tasks": ICfApiHref;
        "start": ICfApiHref;
        "stop": ICfApiHref;
        "revisions": ICfApiHref;
        "deployed_revisions": ICfApiHref;
        "features": ICfApiHref;
    };
}
interface ICFApiObject {
    "guid": string;
    "created_at": string;
    "updated_at": string;
    "name": "my-space";
}
export interface ICfApiSpace extends ICFApiObject {
    "relationships": {
        "organization": ICfApiRelation;
    };
    "links": {
        "self": ICfApiHref;
        "features": ICfApiHref;
        "organization": ICfApiHref;
        "apply_manifest": ICfApiHref;
    };
}
export interface ICfApiOrg extends ICFApiObject {
    suspended: boolean;
    "relationships": {};
    "links": {
        "self": ICfApiHref;
        "domains": ICfApiHref;
        "default_domains": ICfApiHref;
        "quota": ICfApiHref;
    };
}
export interface ICfApiEnv {
    staging_env_json: any;
    running_env_json: any;
    environment_variables: any;
    system_env_json: {
        "VCAP_SERVICES": {
            [servicename: string]: any[];
        };
    };
    application_env_json: any;
}
export interface ICfApiKey extends ICFApiObject {
    "type": "app" | "key";
    "relationships": {
        "app": ICfApiRelation;
        "service_instance": ICfApiRelation;
    };
    "links": {
        "self": ICfApiHref;
        "details": ICfApiHref;
        "parameters": ICfApiHref;
        "service_instance": ICfApiHref;
        "app": ICfApiHref;
    };
}
export {};

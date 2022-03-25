export default function debugenv(settings: IDebugEnvSettings): Promise<void>;
export interface IDebugEnvSettings {
    destination: string[];
    configurations: string;
}

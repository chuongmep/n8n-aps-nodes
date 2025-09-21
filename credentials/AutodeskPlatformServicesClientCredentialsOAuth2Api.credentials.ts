import { ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';

// OAuth2 (Client Credentials) for Autodesk Platform Services (APS)
// Docs: https://aps.autodesk.com/en/docs/oauth/v2
export class AutodeskPlatformServicesClientCredentialsOAuth2Api implements ICredentialType {
    name = 'autodeskPlatformServicesClientCredentialsOAuth2Api';
    displayName = 'Autodesk Platform Services Client Credentials OAuth2 API';
    documentationUrl = 'https://aps.autodesk.com/en/docs/oauth/v2';

    extends = ['oAuth2Api'];

    properties: INodeProperties[] = [
        // Client Credentials flow uses only the token endpoint
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://developer.api.autodesk.com/authentication/v2/token',
        },
        // Force the grant type to client credentials
        {
            displayName: 'Grant Type',
            name: 'grantType',
            type: 'hidden',
            default: 'clientCredentials',
        },
        // Typical scopes for Data Management with app-only access
        {
            displayName: 'Scopes',
            name: 'scope',
            type: 'string',
            default: 'data:read data:write bucket:read bucket:create',
            description: 'Space-separated OAuth scopes for APS 2-legged flow.',
        },
        {
            displayName: 'Token Type',
            name: 'tokenType',
            type: 'hidden',
            default: 'Bearer',
        },
        {
            displayName: 'Authentication',
            name: 'authentication',
            type: 'hidden',
            default: 'header',
        },
    ];

    // Attempt a simple authenticated call. For 2-legged, many APIs require additional context;
    // we hit the OSS buckets list as a minimal permission check.
    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://developer.api.autodesk.com',
            url: '/oss/v2/buckets',
        },
    };
}

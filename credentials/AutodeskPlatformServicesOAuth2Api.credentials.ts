import { ICredentialType, INodeProperties, ICredentialTestRequest } from 'n8n-workflow';

// OAuth2 (Authorization Code) credentials for Autodesk Platform Services (APS)
// Docs: https://aps.autodesk.com/en/docs/oauth/v2
export class AutodeskPlatformServicesOAuth2Api implements ICredentialType {
    name = 'autodeskPlatformServicesOAuth2Api';
    displayName = 'Autodesk Platform Services OAuth2 API';
    documentationUrl = 'https://aps.autodesk.com/en/docs/oauth/v2';

    // Leverage n8n's generic OAuth2 handling
    extends = ['oAuth2Api'];

    properties: INodeProperties[] = [
        // Authorization endpoint for 3-legged OAuth
        {
            displayName: 'Auth URL',
            name: 'authUrl',
            type: 'hidden',
            default: 'https://developer.api.autodesk.com/authentication/v2/authorize',
        },
        // Token endpoint (also used for client credentials, if needed later)
        {
            displayName: 'Access Token URL',
            name: 'accessTokenUrl',
            type: 'hidden',
            default: 'https://developer.api.autodesk.com/authentication/v2/token',
        },
        // Default scopes cover common Data Management use cases. Users can edit if needed.
        {
            displayName: 'Scopes',
            name: 'scope',
            type: 'string',
            default: 'data:read data:write bucket:read bucket:create',
            description: 'Space-separated OAuth scopes. Adjust for your APS use case.',
        },
        // Ensure bearer token in headers (default behavior for oAuth2Api)
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

    // Verify token by calling a simple Data Management endpoint (works with default scopes)
    test: ICredentialTestRequest = {
        request: {
            baseURL: 'https://developer.api.autodesk.com',
            url: '/oss/v2/buckets',
        },
    };
}

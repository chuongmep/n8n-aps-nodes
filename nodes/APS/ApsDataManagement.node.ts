import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

type Operation =
  | 'getHubs'
  | 'getProjects'
  | 'getTopFolders'
  | 'getItems'
  | 'getItemVersions';

export class ApsDataManagement implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Autodesk APS - Data Management',
    name: 'apsDataManagement',
    group: ['transform'],
    version: 1,
  description: 'Read data from Autodesk Platform Services Data Management API.',
    defaults: {
      name: 'APS Data Management',
    },
    inputs: [NodeConnectionType.Main],
    outputs: [NodeConnectionType.Main],
    usableAsTool: true,
    credentials: [
      {
        name: 'autodeskPlatformServicesOAuth2Api',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: 'https://developer.api.autodesk.com',
      headers: {
        Accept: 'application/json',
      },
    },
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Get Hubs', value: 'getHubs', action: 'List hubs available to the user', description: 'List hubs available to the user' },
          { name: 'Get Item Versions', value: 'getItemVersions', action: 'List versions for an item', description: 'List versions for an item' },
          { name: 'Get Items', value: 'getItems', action: 'List items for a folder', description: 'List items for a folder' },
          { name: 'Get Projects', value: 'getProjects', action: 'List projects for a hub', description: 'List projects for a hub' },
          { name: 'Get Top Folders', value: 'getTopFolders', action: 'List top folders of a project', description: 'List top folders of a project' },
        ],
        default: 'getHubs',
      },

      // Output options
      {
        displayName: 'Simplify Output',
        name: 'simplify',
        type: 'boolean',
        default: true,
        description: 'Flatten each JSON:API entity to useful fields (id, type, href, and all attributes).',
      },
      {
        displayName: 'Split Into Items',
        name: 'splitItems',
        type: 'boolean',
        default: true,
        description: 'When enabled, arrays are split so each element becomes an individual n8n item. Disable to return a single item with a data array.',
      },

      // Common inputs for specific operations
      {
        displayName: 'Hub ID',
        name: 'hubId',
        type: 'string',
        default: '',
        required: true,
    displayOptions: { show: { operation: ['getProjects'] } },
  description: 'ID of the hub (e.g., b.123...)',
      },
      {
        displayName: 'Project ID',
        name: 'projectId',
        type: 'string',
        default: '',
        required: true,
    displayOptions: { show: { operation: ['getTopFolders', 'getItems', 'getItemVersions'] } },
  description: 'ID of the project (e.g., b.123... or a GUID).',
      },
      {
        displayName: 'Folder ID',
        name: 'folderId',
        type: 'string',
        default: '',
        required: true,
    displayOptions: { show: { operation: ['getItems'] } },
  description: 'ID of the folder (URN-style, e.g., urn:adsk.wipprod:fs.folder:co.xxxx)',
      },
      {
        displayName: 'Item ID',
        name: 'itemId',
        type: 'string',
        default: '',
        required: true,
    displayOptions: { show: { operation: ['getItemVersions'] } },
  description: 'ID of the item (URN-style, e.g., urn:adsk.wipprod:dm.lineage:xxxx)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const BASE_URL = 'https://developer.api.autodesk.com';

    const simplifyEntity = (entity: any) => {
      const href = entity?.links?.self?.href ?? entity?.links?.href ?? undefined;
      const attributes = (entity?.attributes && typeof entity.attributes === 'object') ? entity.attributes : {};
      return {
        id: entity?.id,
        type: entity?.type,
        href,
        ...attributes,
      } as Record<string, unknown>;
    };

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as Operation;

        let url = '';
        switch (operation) {
          case 'getHubs': {
            url = `${BASE_URL}/project/v1/hubs`;
            break;
          }
          case 'getProjects': {
            const hubId = this.getNodeParameter('hubId', i) as string;
            url = `${BASE_URL}/project/v1/hubs/${encodeURIComponent(hubId)}/projects`;
            break;
          }
          case 'getTopFolders': {
            const projectId = this.getNodeParameter('projectId', i) as string;
            url = `${BASE_URL}/project/v1/projects/${encodeURIComponent(projectId)}/topFolders`;
            break;
          }
          case 'getItems': {
            const projectId = this.getNodeParameter('projectId', i) as string;
            const folderId = this.getNodeParameter('folderId', i) as string;
            url = `${BASE_URL}/data/v1/projects/${encodeURIComponent(projectId)}/folders/${encodeURIComponent(folderId)}/contents`;
            break;
          }
          case 'getItemVersions': {
            const projectId = this.getNodeParameter('projectId', i) as string;
            const itemId = this.getNodeParameter('itemId', i) as string;
            url = `${BASE_URL}/data/v1/projects/${encodeURIComponent(projectId)}/items/${encodeURIComponent(itemId)}/versions`;
            break;
          }
        }

        const response = await this.helpers.requestWithAuthentication.call(this, 'autodeskPlatformServicesOAuth2Api', {
          method: 'GET',
          url,
          qs: {},
          json: true,
          headers: {
            Accept: 'application/vnd.api+json, application/json;q=0.9',
          },
        });

        let body = response as any;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {
            // keep as-is if not valid JSON
          }
        }
        const simplify = this.getNodeParameter('simplify', i, true) as boolean;
        const splitItems = this.getNodeParameter('splitItems', i, true) as boolean;
        if (Array.isArray(body?.data)) {
          if (splitItems) {
            for (const element of body.data) {
              const json = simplify ? simplifyEntity(element) : element;
              returnData.push({ json, pairedItem: { item: i } });
            }
          } else {
            // Wrap in object to comply with n8n item shape
            if (simplify) {
              const data = (body.data as any[]).map((el) => simplifyEntity(el));
              returnData.push({ json: { data }, pairedItem: { item: i } });
            } else {
              returnData.push({ json: body, pairedItem: { item: i } });
            }
          }
        } else if (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
          const target = body.data;
          const json = simplify ? simplifyEntity(target) : target;
          returnData.push({ json, pairedItem: { item: i } });
        } else {
          // Non-JSON:API or unexpected shape; return as-is
          returnData.push({ json: body, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
      }
    }

    return [returnData];
  }
}

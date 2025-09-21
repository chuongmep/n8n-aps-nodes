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
        });

        const results = Array.isArray((response as any)?.data) ? (response as any).data : response;
        returnData.push({ json: results });
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

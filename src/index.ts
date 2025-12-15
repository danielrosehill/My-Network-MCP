#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { NetworkMapStorage } from './storage.js';
import type { NetworkResource, NetworkMap } from './types.js';

const storage = new NetworkMapStorage();

/**
 * Create the MCP server
 */
const server = new Server(
  {
    name: 'my-network-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'show_network_map',
        description: 'Display all network resources in the network map',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'query_resource',
        description: 'Search for network resources by hostname, IP, alias, or service',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (hostname, IP, alias, or service)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_resource',
        description: 'Add a new network resource to the map',
        inputSchema: {
          type: 'object',
          properties: {
            hostname: {
              type: 'string',
              description: 'Primary hostname or identifier',
            },
            ip: {
              type: 'string',
              description: 'IP address',
            },
            description: {
              type: 'string',
              description: 'Human-readable description',
            },
            aliases: {
              type: 'array',
              items: { type: 'string' },
              description: 'Alternative names or aliases',
            },
            os: {
              type: 'string',
              description: 'Operating system',
            },
            services: {
              type: 'array',
              items: { type: 'string' },
              description: 'Installed services or roles',
            },
            sshUser: {
              type: 'string',
              description: 'SSH username',
            },
            sshPort: {
              type: 'number',
              description: 'SSH port (default: 22)',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['hostname', 'ip'],
        },
      },
      {
        name: 'update_resource',
        description: 'Update an existing network resource',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Resource ID to update',
            },
            hostname: { type: 'string' },
            ip: { type: 'string' },
            description: { type: 'string' },
            aliases: {
              type: 'array',
              items: { type: 'string' },
            },
            os: { type: 'string' },
            services: {
              type: 'array',
              items: { type: 'string' },
            },
            sshUser: { type: 'string' },
            sshPort: { type: 'number' },
            metadata: {
              type: 'object',
              description: 'Additional metadata as key-value pairs',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_resource',
        description: 'Remove a resource from the network map',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Resource ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'set_network_info',
        description: 'Set network-level information (name, CIDR, gateway)',
        inputSchema: {
          type: 'object',
          properties: {
            networkName: {
              type: 'string',
              description: 'Network name',
            },
            networkCidr: {
              type: 'string',
              description: 'Network CIDR (e.g., "10.0.0.0/24")',
            },
            gateway: {
              type: 'string',
              description: 'Gateway/router IP',
            },
          },
        },
      },
      {
        name: 'list_services',
        description: 'List all unique services, operating systems, and SSH configurations across the network',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'show_network_map': {
        const map = await storage.load();
        return {
          content: [
            {
              type: 'text',
              text: formatNetworkMap(map),
            },
          ],
        };
      }

      case 'query_resource': {
        const query = (args?.query as string)?.toLowerCase();
        if (!query) {
          throw new Error('Query parameter is required');
        }

        const map = await storage.load();
        const results = map.resources.filter((r) => {
          return (
            r.hostname.toLowerCase().includes(query) ||
            r.ip.includes(query) ||
            r.description?.toLowerCase().includes(query) ||
            r.aliases?.some((a) => a.toLowerCase().includes(query)) ||
            r.services?.some((s) => s.toLowerCase().includes(query)) ||
            r.os?.toLowerCase().includes(query)
          );
        });

        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? formatResources(results)
                : `No resources found matching "${query}"`,
            },
          ],
        };
      }

      case 'add_resource': {
        const map = await storage.load();

        const newResource: NetworkResource = {
          id: generateId(),
          hostname: args?.hostname as string,
          ip: args?.ip as string,
          description: args?.description as string | undefined,
          aliases: args?.aliases as string[] | undefined,
          os: args?.os as string | undefined,
          services: args?.services as string[] | undefined,
          sshUser: args?.sshUser as string | undefined,
          sshPort: args?.sshPort as number | undefined,
          metadata: args?.metadata as Record<string, string> | undefined,
          lastUpdated: new Date().toISOString(),
        };

        map.resources.push(newResource);
        await storage.save(map);

        return {
          content: [
            {
              type: 'text',
              text: `Added resource: ${newResource.hostname} (${newResource.ip})\nID: ${newResource.id}`,
            },
          ],
        };
      }

      case 'update_resource': {
        const id = args?.id as string;
        if (!id) {
          throw new Error('Resource ID is required');
        }

        const map = await storage.load();
        const resource = map.resources.find((r) => r.id === id);

        if (!resource) {
          throw new Error(`Resource with ID ${id} not found`);
        }

        // Update fields if provided
        if (args?.hostname) resource.hostname = args.hostname as string;
        if (args?.ip) resource.ip = args.ip as string;
        if (args?.description !== undefined) resource.description = args.description as string;
        if (args?.aliases) resource.aliases = args.aliases as string[];
        if (args?.os !== undefined) resource.os = args.os as string;
        if (args?.services) resource.services = args.services as string[];
        if (args?.sshUser !== undefined) resource.sshUser = args.sshUser as string;
        if (args?.sshPort !== undefined) resource.sshPort = args.sshPort as number;
        if (args?.metadata !== undefined) resource.metadata = args.metadata as Record<string, string>;
        resource.lastUpdated = new Date().toISOString();

        await storage.save(map);

        return {
          content: [
            {
              type: 'text',
              text: `Updated resource: ${resource.hostname} (${resource.ip})`,
            },
          ],
        };
      }

      case 'delete_resource': {
        const id = args?.id as string;
        if (!id) {
          throw new Error('Resource ID is required');
        }

        const map = await storage.load();
        const index = map.resources.findIndex((r) => r.id === id);

        if (index === -1) {
          throw new Error(`Resource with ID ${id} not found`);
        }

        const deleted = map.resources.splice(index, 1)[0];
        await storage.save(map);

        return {
          content: [
            {
              type: 'text',
              text: `Deleted resource: ${deleted.hostname} (${deleted.ip})`,
            },
          ],
        };
      }

      case 'set_network_info': {
        const map = await storage.load();

        if (args?.networkName) map.networkName = args.networkName as string;
        if (args?.networkCidr) map.networkCidr = args.networkCidr as string;
        if (args?.gateway) map.gateway = args.gateway as string;

        await storage.save(map);

        return {
          content: [
            {
              type: 'text',
              text: 'Network information updated',
            },
          ],
        };
      }

      case 'list_services': {
        const map = await storage.load();

        if (map.resources.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No resources in network map.',
              },
            ],
          };
        }

        // Collect unique services, OSes, and SSH configs
        const services = new Set<string>();
        const operatingSystems = new Set<string>();
        const sshConfigs: Array<{ hostname: string; user?: string; port?: number }> = [];

        for (const resource of map.resources) {
          if (resource.services) {
            resource.services.forEach(s => services.add(s));
          }
          if (resource.os) {
            operatingSystems.add(resource.os);
          }
          if (resource.sshUser || resource.sshPort) {
            sshConfigs.push({
              hostname: resource.hostname,
              user: resource.sshUser,
              port: resource.sshPort,
            });
          }
        }

        let output = '# Network Services Overview\n\n';

        output += `## Unique Services (${services.size})\n`;
        if (services.size > 0) {
          output += Array.from(services).sort().map(s => `- ${s}`).join('\n') + '\n';
        } else {
          output += 'No services defined\n';
        }

        output += `\n## Operating Systems (${operatingSystems.size})\n`;
        if (operatingSystems.size > 0) {
          output += Array.from(operatingSystems).sort().map(os => `- ${os}`).join('\n') + '\n';
        } else {
          output += 'No operating systems defined\n';
        }

        output += `\n## SSH Configurations (${sshConfigs.length})\n`;
        if (sshConfigs.length > 0) {
          output += sshConfigs
            .map(cfg => {
              let line = `- **${cfg.hostname}**`;
              if (cfg.user) line += ` - User: ${cfg.user}`;
              if (cfg.port) line += ` - Port: ${cfg.port}`;
              return line;
            })
            .join('\n');
        } else {
          output += 'No SSH configurations defined\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * List resources (expose network map as MCP resource)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'network://map',
        name: 'Network Map',
        description: 'Complete network resource map',
        mimeType: 'application/json',
      },
    ],
  };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'network://map') {
    const map = await storage.load();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(map, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

/**
 * Format network map for display
 */
function formatNetworkMap(map: NetworkMap): string {
  let output = '# Network Map\n\n';

  if (map.networkName) {
    output += `**Network:** ${map.networkName}\n`;
  }
  if (map.networkCidr) {
    output += `**CIDR:** ${map.networkCidr}\n`;
  }
  if (map.gateway) {
    output += `**Gateway:** ${map.gateway}\n`;
  }

  output += `\n**Resources:** ${map.resources.length}\n\n`;
  output += formatResources(map.resources);

  return output;
}

/**
 * Format resources for display
 */
function formatResources(resources: NetworkResource[]): string {
  if (resources.length === 0) {
    return 'No resources in network map.';
  }

  return resources
    .map((r) => {
      let output = `## ${r.hostname}\n`;
      output += `- **IP:** ${r.ip}\n`;
      output += `- **ID:** ${r.id}\n`;
      if (r.description) output += `- **Description:** ${r.description}\n`;
      if (r.aliases && r.aliases.length > 0) {
        output += `- **Aliases:** ${r.aliases.join(', ')}\n`;
      }
      if (r.os) output += `- **OS:** ${r.os}\n`;
      if (r.services && r.services.length > 0) {
        output += `- **Services:** ${r.services.join(', ')}\n`;
      }
      if (r.sshUser) output += `- **SSH User:** ${r.sshUser}\n`;
      if (r.sshPort) output += `- **SSH Port:** ${r.sshPort}\n`;
      if (r.metadata && Object.keys(r.metadata).length > 0) {
        output += `- **Metadata:** ${JSON.stringify(r.metadata)}\n`;
      }
      if (r.lastUpdated) {
        output += `- **Last Updated:** ${new Date(r.lastUpdated).toLocaleString()}\n`;
      }
      return output;
    })
    .join('\n');
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('My Network MCP server running on stdio');
  console.error(`Network map location: ${storage.getMapPath()}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

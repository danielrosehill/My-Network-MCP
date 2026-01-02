# My Network MCP

[![npm version](https://img.shields.io/npm/v/my-network-mcp.svg)](https://www.npmjs.com/package/my-network-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides AI agents with network topology information. Deploy it as an HTTP service for use with MCP aggregators, or run standalone.

## The Motivator / Use-Case

Agentic AI tools like Claude Code are incredibly useful for local system administration. They can also be used to manage remote systems.

SSH provides the fundamental backbone of connectivity between computing resources.

To perform SSH operations, AI agents need a network map. This can be manually provided in context or instructed by reference to your SSH aliases. But to support easy use across different clients, it makes more sense to have this configuration provided by a centrally managed MCP server.

The idea of My Network MCP is to align with the principle that MCP tools work best when their purpose is narrow and their tool definition is therefore modest. The sole purpose of this MCP server is to provide a user-maintained list of local network resources.

## v2.0 - Streamable HTTP Transport

Version 2.0 refactored from stdio transport to **Streamable HTTP transport**, making it suitable for deployment on MCP aggregation servers like MetaMCP. The server now runs as an HTTP service with full session management.

## Installation & Deployment

### Prerequisites

- Node.js 18 or higher

### Option 1: Deploy with Docker (Recommended for Servers)

```dockerfile
FROM node:20-slim
WORKDIR /app
RUN npm install -g my-network-mcp
EXPOSE 3000
CMD ["my-network-mcp"]
```

Build and run:
```bash
docker build -t my-network-mcp .
docker run -d -p 3000:3000 -v ~/.config/my-network-mcp:/root/.config/my-network-mcp my-network-mcp
```

### Option 2: Run Directly with npm/npx

```bash
# Install globally
npm install -g my-network-mcp

# Run the server
my-network-mcp
```

Or run without installing:
```bash
npx my-network-mcp
```

### Option 3: Install from Source

```bash
git clone https://github.com/danielrosehill/My-Network-MCP.git
cd My-Network-MCP
npm install
npm run build
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PORT` | `3000` | HTTP port to listen on |
| `MCP_HOST` | `0.0.0.0` | Host to bind to |
| `NETWORK_MAP_PATH` | `~/.config/my-network-mcp/network-map.json` | Path to network map file |

### Example with Custom Configuration

```bash
MCP_PORT=8080 MCP_HOST=127.0.0.1 NETWORK_MAP_PATH=/data/network.json my-network-mcp
```

## Adding to MCP Aggregators

### MetaMCP / Generic Streamable HTTP

Add this server to your MCP aggregator with the following configuration:

```json
{
  "name": "my-network",
  "transport": "streamable-http",
  "url": "http://your-server:3000/mcp"
}
```

### Example: MetaMCP Configuration

```json
{
  "servers": [
    {
      "name": "my-network",
      "transport": "streamable-http",
      "url": "http://10.0.0.6:3000/mcp",
      "description": "Local network resource map"
    }
  ]
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/mcp` | JSON-RPC requests (MCP protocol) |
| `GET` | `/mcp` | SSE stream for server notifications |
| `DELETE` | `/mcp` | Session termination |
| `GET` | `/health` | Health check endpoint |

### Health Check

```bash
curl http://localhost:3000/health
# {"status":"ok","service":"my-network-mcp","version":"2.0.0"}
```

## Available Tools

### `show_network_map`
Display all network resources in your network map.

**Example prompt:**
> Claude, show me my network map

### `query_resource`
Search for resources by hostname, IP, alias, OS, or service.

**Example prompts:**
> Find all resources running Docker
> What's the IP of my NAS?
> Show me all Ubuntu machines

### `add_resource`
Add a new network resource to the map.

**Required fields:**
- `hostname`: Primary identifier
- `ip`: IP address

**Optional fields:**
- `description`: Human-readable description
- `aliases`: Alternative names
- `os`: Operating system
- `services`: Installed services
- `sshUser`: SSH username
- `sshPort`: SSH port (default: 22)
- `metadata`: Additional key-value pairs for custom data

**Example prompt:**
> Claude, add a new resource:
> - hostname: pi-hole
> - ip: 10.0.0.10
> - description: DNS ad blocker
> - services: DNS, Web UI

### `update_resource`
Update an existing resource. Use the resource ID from `show_network_map`.

**Example prompt:**
> Update resource res_12345 to add SSH service

### `delete_resource`
Remove a resource from the map by ID.

**Example prompt:**
> Delete resource res_12345

### `set_network_info`
Set network-level information (name, CIDR, gateway).

**Example prompt:**
> Set network name to "Home Lab" and CIDR to 10.0.0.0/24

### `list_services`
List all unique services, operating systems, and SSH configurations across your network.

**Example prompts:**
> Claude, show me all services running on my network
> What operating systems are in use?

## MCP Resource

The network map is also exposed as an MCP resource at `network://map`, allowing AI agents to read the entire map as JSON.

## Initial Setup

The first time you use the MCP, you'll need to populate your network map:

1. **Use the example as a starting point:**
   ```bash
   cp example-network-map.json ~/.config/my-network-mcp/network-map.json
   ```
   Then edit it to match your network.

2. **Let Claude build it for you** using the MCP tools.

## Example Workflows

### Initial Network Discovery
> Claude, I need to set up my network map. My network is 10.0.0.0/24 with gateway at 10.0.0.1. Add these resources:
> - Firewall (OPNsense) at 10.0.0.1
> - NAS at 10.0.0.50
> - Workstation at 10.0.0.6

### Querying the Network
> What SSH services are available on my network?
> Show me all the resources with Docker installed
> What's at 10.0.0.3?

### SSH Operations
> SSH to my NAS and check disk space
> Connect to the Ubuntu VM and update packages

The MCP provides context so Claude knows where to connect without you having to specify IPs repeatedly.

## Network Map Format

The network map is stored as JSON:

```json
{
  "networkName": "Home Lab",
  "networkCidr": "10.0.0.0/24",
  "gateway": "10.0.0.1",
  "resources": [
    {
      "id": "res_...",
      "hostname": "server1",
      "ip": "10.0.0.10",
      "description": "...",
      "aliases": ["alias1", "alias2"],
      "os": "Ubuntu 24.04",
      "services": ["SSH", "Docker"],
      "sshUser": "admin",
      "sshPort": 22,
      "metadata": {},
      "lastUpdated": "2025-12-15T..."
    }
  ],
  "metadata": {
    "created": "...",
    "lastModified": "...",
    "version": "2.0.0"
  }
}
```

## File Structure

```
.
├── src/
│   ├── index.ts        # HTTP server & MCP handlers
│   ├── types.ts        # TypeScript type definitions
│   └── storage.ts      # Network map storage manager
├── dist/               # Compiled JavaScript (generated)
├── example-network-map.json
├── package.json
├── tsconfig.json
└── README.md
```

## Migration from v1.x

If upgrading from v1.x (stdio transport):

1. The server now runs as an HTTP service instead of stdio
2. Update your MCP client configuration to use streamable HTTP transport
3. Network map format is unchanged - no data migration needed
4. Set `MCP_PORT` and `MCP_HOST` environment variables as needed

## License

MIT

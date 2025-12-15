# My Network MCP (Planning Notes)

## The Motivator / Use-Case

Agentic AI tools like Claude Code are incredibly useful for local system administration. They can also be used to manage remote systems.

SSH provides the fundamental backbone of connectivity between computing resources.

Some MCP servers exist to standardize SSH operations, but in many cases these really just create bloat. Agentic AI tools have generally good innate knowledge of SSH.

To perform SSH operations, AI agents need a network map.

This can be manually provided in context or instructed by reference to your SSH aliases. But to support easy use across different clients, it makes more sense to have this configuration provided by a centrally managed MCP server on the local area network.

The idea of My Network MCP is to align with the principle that MCP tools work best when their purpose is narrow and their tool definition is therefore modest. The sole purpose of this MCP server is to provide a user-maintained list of local network resources to avoid having to repeatedly explain: "connect to Y, that's at Z."

In a more complicated implementation, the MCP might support environment variables for understanding authentication. This simple version is intended for use in a home lab environment. The assumption is that the clients have mutual SSH authentication configured.

## Implementation

Another assumption baked into this is that the pool of resources on the local network is fairly static. The idea is that the user can define their core network parameters, which are also assumed to be static, and just maintain static IP addresses for resources that are frequently accessed by agents.

This essentially creates a network-level SSH alias map for the agent to use when resolving questions about what resource does what. Unlike a standard SSH config alias map, however, this concept allows the user to provide additional verbosity: descriptive names, synonyms for specific resources, operating systems, installed services, and other metadata.

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. **Clone and build:**
   ```bash
   cd ~/repos/github/My-Network-MCP
   npm install
   npm run build
   ```

2. **Configure network map location (optional):**

   By default, the network map is stored at `~/.config/my-network-mcp/network-map.json`

   To use a custom location, set the `NETWORK_MAP_PATH` environment variable:
   ```bash
   export NETWORK_MAP_PATH=/path/to/your/network-map.json
   ```

3. **Add to Claude Desktop config:**

   Edit your Claude Desktop MCP settings file:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

   Add the server configuration:
   ```json
   {
     "mcpServers": {
       "my-network": {
         "command": "node",
         "args": ["/home/daniel/repos/github/My-Network-MCP/dist/index.js"]
       }
     }
   }
   ```

   Or using environment variable:
   ```json
   {
     "mcpServers": {
       "my-network": {
         "command": "node",
         "args": ["/home/daniel/repos/github/My-Network-MCP/dist/index.js"],
         "env": {
           "NETWORK_MAP_PATH": "/path/to/custom/network-map.json"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop**

## Usage

### Initial Setup

The first time you use the MCP, you'll need to populate your network map. You can either:

1. **Use the example as a starting point:**
   ```bash
   cp example-network-map.json ~/.config/my-network-mcp/network-map.json
   ```
   Then edit it to match your network.

2. **Let Claude build it for you** using the MCP tools (see below).

### Available Tools

#### `show_network_map`
Display all network resources in your network map.

**Example:**
> Claude, show me my network map

#### `query_resource`
Search for resources by hostname, IP, alias, OS, or service.

**Example:**
> Find all resources running Docker
> What's the IP of my NAS?
> Show me all Ubuntu machines

#### `add_resource`
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

**Example:**
> Claude, add a new resource:
> - hostname: pi-hole
> - ip: 10.0.0.10
> - description: DNS ad blocker
> - services: DNS, Web UI

#### `update_resource`
Update an existing resource. Use the resource ID from `show_network_map`.

**Example:**
> Update resource res_12345 to add SSH service

#### `delete_resource`
Remove a resource from the map by ID.

**Example:**
> Delete resource res_12345

#### `set_network_info`
Set network-level information (name, CIDR, gateway).

**Example:**
> Set network name to "Home Lab" and CIDR to 10.0.0.0/24

### Resource as MCP Resource

The network map is also exposed as an MCP resource at `network://map`, allowing Claude to read the entire map as JSON when needed.

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

## File Structure

```
.
├── src/
│   ├── index.ts        # Main MCP server
│   ├── types.ts        # TypeScript type definitions
│   └── storage.ts      # Network map storage manager
├── dist/               # Compiled JavaScript (generated)
├── example-network-map.json  # Example network configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Network Map Format

The network map is stored as JSON with the following structure:

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
    "version": "1.0.0"
  }
}
```

## License

MIT


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


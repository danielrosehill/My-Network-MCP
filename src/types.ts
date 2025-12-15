/**
 * Represents a network resource (host/device) on the local network
 */
export interface NetworkResource {
  /** Unique identifier for the resource */
  id: string;

  /** Primary hostname or identifier */
  hostname: string;

  /** IP address (IPv4 or IPv6) */
  ip: string;

  /** Human-readable description */
  description?: string;

  /** Alternative names or aliases */
  aliases?: string[];

  /** Operating system (e.g., "Ubuntu 22.04", "Windows 11", "OPNsense") */
  os?: string;

  /** Installed services or roles (e.g., ["SSH", "Docker", "Nginx"]) */
  services?: string[];

  /** SSH username if different from default */
  sshUser?: string;

  /** SSH port if non-standard */
  sshPort?: number;

  /** Additional metadata */
  metadata?: Record<string, string>;

  /** Last updated timestamp */
  lastUpdated?: string;
}

/**
 * Network map containing all resources
 */
export interface NetworkMap {
  /** Network name or identifier */
  networkName?: string;

  /** Network CIDR (e.g., "10.0.0.0/24") */
  networkCidr?: string;

  /** Gateway/router IP */
  gateway?: string;

  /** List of all network resources */
  resources: NetworkResource[];

  /** Map metadata */
  metadata?: {
    created?: string;
    lastModified?: string;
    version?: string;
  };
}

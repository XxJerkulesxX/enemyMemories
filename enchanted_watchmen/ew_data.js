// SimulateTCPIPConnection class
// SimulateTCPIPConnection class
// SimulateTCPIPConnection class

//rewrite the simulate tcpIP connection
//so that is organized into these five steps
//1 Initial Communication Within the Private Network (Before NAT):
//2.NAT Translation (At the Router):
//3.Communication Over the Internet:
//4.NAT Translation (At the Destination's Router):
//5.Final Communication Within the Destination's Private Network (After NAT):
class SimulateTCPIPConnection {
    constructor(sourceIP, destinationIP, sourcePublicIP, destinationPublicIP, sourcePort, destinationPort, protocol) {
        this.sourceIP = sourceIP;
        this.destinationIP = destinationIP;
        this.sourcePublicIP = sourcePublicIP;
        this.destinationPublicIP = destinationPublicIP;
        this.sourcePort = sourcePort;
        this.destinationPort = destinationPort;
        this.protocol = protocol;
        this.sequenceNumber = 0;
        this.acknowledgmentNumber = 0;
        this.tcpFlags = [];
        this.windowSize = 0;
        this.maximumSegmentSize = 0;
        this.roundTripTime = 0;
        this.congestionWindow = 0;
        this.socketState = 'CLOSED';
        this.natTable = this.performNAT();
    }

    setSequenceNumber(sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }

    setAcknowledgmentNumber(acknowledgmentNumber) {
        this.acknowledgmentNumber = acknowledgmentNumber;
    }

    setTCPFlags(tcpFlags) {
        this.tcpFlags = tcpFlags;
    }

    setWindowSize(windowSize) {
        this.windowSize = windowSize;
    }

    setMaximumSegmentSize(maximumSegmentSize) {
        this.maximumSegmentSize = maximumSegmentSize;
    }

    setRoundTripTime(roundTripTime) {
        this.roundTripTime = roundTripTime;
    }

    setCongestionWindow(congestionWindow) {
        this.congestionWindow = congestionWindow;
    }

    setSocketState(socketState) {
        this.socketState = socketState;
    }

    performNAT() {
        const natTable = {};
        const privateIPRange = /^(192\.168|10|172\.(1[6-9]|2[0-9]|3[0-1]))\./;
        console.log('Initial Source IP:', this.sourceIP);
        console.log('Initial Destination IP:', this.destinationIP);

        // Check if sourceIP is private and needs NAT
        if (privateIPRange.test(this.sourceIP)) {
            natTable[this.sourceIP] = this.sourcePublicIP;
            this.sourceIP = this.sourcePublicIP;
        }

        // Check if destinationIP is private and needs NAT (for server behind NAT)
        if (privateIPRange.test(this.destinationIP)) {
            natTable[this.destinationIP] = this.destinationPublicIP;
            this.destinationIP = this.destinationPublicIP;
        }

        console.log('Post-NAT Source IP:', this.sourceIP);
        console.log('Post-NAT Destination IP:', this.destinationIP);
        console.log('Protocol:', this.protocol);
        return natTable;
    }
  }


let testOne = new SimulateTCPIPConnection('85.49.14.74',
    '201.4.194.248',
    '36.73.192.176',
    '176.165.100.103');


// Example usage
const privateSourceIP = '192.168.1.2';
const publicSourceIP = '174.56.75.207';
const publicDestinationIP = '203.0.113.5';
const privateDestinationIP = '10.0.0.5';
const sourcePort = 12345;
const destinationPort = 80;

const connection = new SimulateTCPIPConnection(privateSourceIP, privateDestinationIP, publicSourceIP, publicDestinationIP, sourcePort, destinationPort);


console.log(`Source IP: ${connection.sourceIP}`);
console.log(`Destination IP: ${connection.destinationIP}`);
console.log('NAT Table:', connection.natTable);

class SSH {
    constructor(sourceIP, destinationIP, sourcePort, destinationPort, username) {
        this.sourceIP = sourceIP;
        this.destinationIP = destinationIP;
        this.sourcePort = sourcePort;
        this.destinationPort = destinationPort;
        this.username = username;
        this.clientPublicKey = null;
        this.clientPrivateKey = null;
        this.serverPublicKey = null;
        this.serverPrivateKey = null;
        this.encryptionAlgorithm = 'AES';
        this.hashAlgorithm = 'SHA-2';
        this.sessionEstablished = false;
        this.channels = [];
        this.configFile = 'ssh_config';
        this.logFile = 'ssh_log';
        this.useCompression = false;
    }

    generateClientKeyPair(keyType) {
        console.log('Generating client key pair...');
        const command = `ssh-keygen -t ${keyType}`;
        console.log(`Command: ${command}`);

        // Generate client public and private keys using the specified key type
        // ...
        this.clientPublicKey = `client_${keyType}_public_key`;
        this.clientPrivateKey = `client_${keyType}_private_key`;
        console.log('Client key pair generated.');

        // Search for the server's public key in the known_hosts file
        const serverPublicKey = this.searchKnownHosts(this.destinationIP);

        if (serverPublicKey) {
            console.log(`Server public key found in known_hosts: ${serverPublicKey}`);
        } else {
            console.log('Server public key not found in known_hosts. Adding it...');
            this.addToKnownHosts(this.destinationIP, this.serverPublicKey);
        }
    }

    searchKnownHosts(serverIP) {
        return this.knownHosts[serverIP] || null;
    }

    addToKnownHosts(serverIP, serverPublicKey) {
        this.knownHosts[serverIP] = serverPublicKey;
        console.log(`Added server ${serverIP} with public key: ${serverPublicKey} to known_hosts.`);
    }

    generateServerKeyPair(keyType) {
        console.log('Generating server key pair...');
        const command = `ssh-keygen -t ${keyType}`;
        console.log(`Command: ${command}`);
        // Generate server public and private keys using the specified key type
        // ...
        this.serverPublicKey = `server_${keyType}_public_key`;
        this.serverPrivateKey = `server_${keyType}_private_key`;
        console.log('Server key pair generated.');
    }

    establishConnection() {
        console.log(`Establishing SSH connection from ${this.sourceIP}:${this.sourcePort} to ${this.destinationIP}:${this.destinationPort}`);
        console.log(`Username: ${this.username}`);
        console.log(`Encryption Algorithm: ${this.encryptionAlgorithm}`);
        console.log(`Hash Algorithm: ${this.hashAlgorithm}`);

        // Perform key exchange and authentication
        // ...

        this.sessionEstablished = true;
        console.log('SSH connection established successfully.');
    }

    createChannel(channelType) {
        if (this.sessionEstablished) {
            const channel = {
                type: channelType,
                id: this.channels.length + 1
            };
            this.channels.push(channel);
            console.log(`Created ${channelType} channel with ID ${channel.id}`);
        } else {
            console.log('Cannot create channel. SSH connection not established.');
        }
    }

    configureSSH(configOptions) {
        console.log(`Configuring SSH using ${this.configFile}`);
        // Apply configuration options
        // ...
        console.log('SSH configuration updated.');
    }

    enableCompression() {
        this.useCompression = true;
        console.log('SSH compression enabled.');
    }

    logActivity(activity) {
        console.log(`Logging activity: ${activity}`);
        // Append activity to logFile
        // ...
    }
}
// Assuming you want to print or simulate further actions
connection.setSequenceNumber(1000);
connection.setAcknowledgmentNumber(1001);
connection.setTCPFlags(['SYN', 'ACK']);
connection.setWindowSize(65535);
connection.setMaximumSegmentSize(1460);
connection.setRoundTripTime(50);
connection.setCongestionWindow(10);
connection.setSocketState('ESTABLISHED');

console.log(`Sequence Number: ${connection.sequenceNumber}`);
console.log(`Acknowledgment Number: ${connection.acknowledgmentNumber}`);
console.log(`TCP Flags: ${connection.tcpFlags}`);
console.log(`Window Size: ${connection.windowSize}`);
console.log(`Maximum Segment Size: ${connection.maximumSegmentSize}`);
console.log(`Round Trip Time: ${connection.roundTripTime}`);
console.log(`Congestion Window: ${connection.congestionWindow}`);
console.log(`Socket State: ${connection.socketState}`);


// Base Network class

class Network {
    constructor(connection) {
        if (connection instanceof SimulateTCPIPConnection) {
            this.connections = [connection];
        } else {
            throw new Error('Invalid connection parameter. Must be an instance of SimulateTCPIPConnection.');
        }
    }

    addConnection(connection) {
        if (connection instanceof SimulateTCPIPConnection) {
            this.connections.push(connection);
        } else {
            throw new Error('Invalid connection parameter. Must be an instance of SimulateTCPIPConnection.');
        }
    }

    removeConnection(connection) {
        const index = this.connections.indexOf(connection);
        if (index !== -1) {
            this.connections.splice(index, 1);
        }
    }

    connectToNetwork(connection) {
        if (this.connections.includes(connection)) {
            console.log(`${connection.sourceIP} is already connected to the network.`);
        } else {
            this.addConnection(connection);
            console.log(`${connection.sourceIP} is now connected to the network.`);
        }
    }

    disconnectFromNetwork(connection) {
        if (this.connections.includes(connection)) {
            this.removeConnection(connection);
            console.log(`${connection.sourceIP} is now disconnected from the network.`);
        } else {
            console.log(`${connection.sourceIP} is not connected to the network.`);
        }
    }

    simulateTCPIPCommunication(sourceIP, destinationIP, data) {
        const sourceConnection = this.connections.find(conn => conn.sourceIP === sourceIP);
        const destinationConnection = this.connections.find(conn => conn.destinationIP === destinationIP);

        if (sourceConnection && destinationConnection) {
            console.log(`Simulating TCP/IP communication from ${sourceIP} to ${destinationIP}:`);
            console.log(`Data: ${data}`);
            console.log('Encapsulating data into packets...');
            console.log('Sending packets through the network...');
            console.log('Receiving packets at the destination...');
            console.log('Decapsulating packets and retrieving data...');
            console.log('Data received successfully!');
        } else {
            console.log('Source or destination IP is not connected to the network.');
        }
    }
}

// Bus Network class
class BusNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Bus Network';
    }
}

// Star Network class
class StarNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Star Network';
        this.centralNode = null;
    }

    setCentralNode(connection) {
        if (connection instanceof SimulateTCPIPConnection) {
            this.centralNode = connection;
        } else {
            throw new Error('Invalid connection parameter. Must be an instance of SimulateTCPIPConnection.');
        }
    }
}

// Ring Network class
class RingNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Ring Network';
    }
}

// Mesh Network class
class MeshNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Mesh Network';
    }
}

// Fully Connected Network class
class FullyConnectedNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Fully Connected Network';
    }
}

// Tree Network class
class TreeNetwork extends Network {
    constructor(connection) {
        super(connection);
        this.type = 'Tree Network';
    }
}



class IPAddress {
    constructor(address, subnet, range, numAddresses, purpose, allocation, isPrivate) {
        this.address = address;
        this.subnet = subnet;
        this.range = range;
        this.numAddresses = numAddresses;
        this.purpose = purpose;
        this.allocation = allocation;
        this.isPrivate = isPrivate;
    }

    static isValidIPv4(address) {
        const octets = address.split('.');
        if (octets.length !== 4) {
            return false;
        }
        for (const octet of octets) {
            const num = parseInt(octet, 10);
            if (isNaN(num) || num < 0 || num > 255) {
                return false;
            }
        }
        return true;
    }

    static isPrivateIPv4(address) {
        const privateRanges = [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
        ];
        for (const range of privateRanges) {
            const [network, mask] = range.split('/');
            if (IPAddress.isInSubnet(address, network, mask)) {
                return true;
            }
        }
        return false;
    }

    static isInSubnet(address, network, mask) {
        const addressOctets = address.split('.').map(Number);
        const networkOctets = network.split('.').map(Number);
        const maskOctets = IPAddress.maskToOctets(mask);
        for (let i = 0; i < 4; i++) {
            if ((addressOctets[i] & maskOctets[i]) !== (networkOctets[i] & maskOctets[i])) {
                return false;
            }
        }
        return true;
    }

    static maskToOctets(mask) {
        const ones = parseInt(mask, 10);
        const octets = [0, 0, 0, 0];
        for (let i = 0; i < ones; i++) {
            octets[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
        }
        return octets;
    }
}


// Web Server class
class WebServer {
    constructor(name, ip, port) {
        this.name = name;
        this.ip = ip;
        this.port = port;
        this.running = false;
    }

    start() {
        console.log(`Starting ${this.name} server...`);
        this.running = true;
    }

    stop() {
        console.log(`Stopping ${this.name} server...`);
        this.running = false;
    }

    acceptRequests(protocol) {
        if (this.running) {
            console.log(`Accepting requests via ${protocol}.`);
        } else {
            console.log(`Server is not running. Unable to accept requests.`);
        }
    }

    storeResources(resources) {
        console.log(`Storing resources: ${resources.join(', ')}`);
    }

    handleError(error) {
        console.error(`Error: ${error}`);
    }
}

// Nginx class (extends WebServer)
class Nginx extends WebServer {
    constructor(name, ip, port, nginx_conf = {}, sites_avail_default = {}) {
        super(name, ip, port);
        this.reverseProxy = false;
        this.loadBalancing = false;
        this.caching = false;
        this.gzipCompression = false;
        this.sslTermination = false;

        if (typeof nginx_conf !== 'object') {
            nginx_conf = {
                user: 'www-data',
                worker_processes: 'auto',
                pid: '/run/nginx.pid',
                events: {
                    worker_connections: 1024
                },
                http: {
                    include: [
                        '/etc/nginx/mime.types'
                    ],
                    default_type: 'application/octet-stream',
                    log_format: {
                        main: '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "$http_x_forwarded_for"'
                    },
                    access_log: '/var/log/nginx/access.log main',
                    sendfile: 'on',
                    tcp_nopush: 'on',
                    tcp_nodelay: 'on',
                    keepalive_timeout: 65,
                    types_hash_max_size: 2048
                }
            };
        }

        if (typeof sites_avail_default !== 'object') {
            sites_avail_default = {
                global_settings: {
                    instructions: 'General instructions and SSL configuration guidelines.'
                },
                server_block: {
                    listen: 80,
                    server_name: '_',
                    root: '/var/www/html',
                    index: 'index.html index.htm index.nginx-debian.html',
                    location: {
                        '/': {
                            try_files: '$uri $uri/ =404'
                        }
                    }
                },
                php_and_access_control: {
                    php: `
              # pass PHP scripts to FastCGI server
              #location ~ \\.php$ {
              #    include snippets/fastcgi-php.conf;
              #    fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
              #}
            `,
                    access_control: `
              # deny access to .htaccess files
              #location ~ /\\.ht {
              #    deny all;
              #}
            `
                },
                example_virtual_host: `
            # Virtual Host configuration for example.com
            #server {
            #    listen 80;
            #    listen [::]:80;
            #
            #    server_name example.com www.example.com;
            #    root /var/www/example.com;
            #    index index.html;
            #
            #    location / {
            #        try_files $uri $uri/ =404;
            #    }
            #}
          `
            };
        }

        this.nginx_conf = nginx_conf;
        this.sites_avail_default = sites_avail_default;
    }

    enableReverseProxy() {
        this.reverseProxy = true;
        console.log('Reverse proxy enabled.');
    }

    enableLoadBalancing() {
        this.loadBalancing = true;
        console.log('Load balancing enabled.');
    }

    enableCaching() {
        this.caching = true;
        console.log('Caching enabled.');
    }

    enableGzipCompression() {
        this.gzipCompression = true;
        console.log('Gzip compression enabled.');
    }

    enableSSLTermination() {
        this.sslTermination = true;
        console.log('SSL/TLS termination enabled.');
    }

    serveStaticFiles(files) {
        console.log(`Serving static files: ${files.join(', ')}`);
    }

    rewriteURL(oldURL, newURL) {
        console.log(`Rewriting URL from "${oldURL}" to "${newURL}"`);
    }
}

class DNSRecord {
    constructor(name, type, ttl, data) {
        this.name = name;
        this.type = type;
        this.ttl = ttl;
        this.class = 'IN'; // Default class is 'IN' (Internet)
        this.data = data;
    }
}
class ARecord extends DNSRecord {
    constructor(name, ttl, ipAddress) {
        super(name, 'A', ttl, ipAddress);
        this.ipAddress = ipAddress;
    }
}

class CNAMERecord extends DNSRecord {
    constructor(name, ttl, target) {
        if (target instanceof ARecord) {
            super(name, 'CNAME', ttl, target.name);
            this.target = target;
        } else if (typeof target === 'string') {
            super(name, 'CNAME', ttl, target);
            this.target = target;
        } else {
            throw new Error('Invalid target for CNAME record. Must be an ARecord instance or a domain name string.');
        }
    }
}
class MXRecord extends DNSRecord {
    constructor(name, ttl, preference, exchange) {
        super(name, 'MX', ttl, `${preference} ${exchange}`);
    }
}

class TXTRecord extends DNSRecord {
    constructor(name, ttl, value) {
        super(name, 'TXT', ttl, value);
    }
}

class SSHConnection {
    constructor(host, port = 22) {
        this.host = host;
        this.port = port;
        this.isConnected = false;
        this.authMethod = null;
    }

    connect(authMethod, authData) {
        // Simulating authentication process
        if (this.isValidAuthMethod(authMethod) && this.authenticateUser(authData)) {
            this.isConnected = true;
            this.authMethod = authMethod;
            return 'SSH connection established';
        } else {
            return 'Authentication failed';
        }
    }

    isValidAuthMethod(authMethod) {
        const validMethods = ['password', 'publicKey', 'keyboardInteractive'];
        return validMethods.includes(authMethod);
    }

    authenticateUser(authData) {
        // Simulating user authentication
        // In a real implementation, you would validate the authData against the server
        // For demonstration purposes, we assume the authData is valid
        return true;
    }

    disconnect() {
        this.isConnected = false;
        this.authMethod = null;
        return 'SSH connection disconnected';
    }

    execute(command) {
        if (this.isConnected) {
            // Simulating command execution
            return `Executing command: ${command}`;
        } else {
            return 'No active SSH connection';
        }
    }

    getConnectionStatus() {
        return this.isConnected ? 'Connected' : 'Disconnected';
    }
}



//type
class Host {
    constructor(name, provider, serverType, operatingSystem) {
        this.name = name;
        this.type = undefined;
        this.provider = provider;
        this.serverType = serverType;
        this.operatingSystem = operatingSystem;
        this.ipAddress = '';
        this.diskSpace = 0;
        this.bandwidth = 0;
        this.ramSize = 0;
        this.cpuCores = 0;
        this.SSL = false;
        this.backupEnabled = false;
        this.uptimeGuarantee = 0;
        this.pricePerMonth = 0;
    }

    setIPAddress(ipAddress) {
        this.ipAddress = ipAddress;
    }

    setDiskSpace(diskSpace) {
        this.diskSpace = diskSpace;
    }

    setBandwidth(bandwidth) {
        this.bandwidth = bandwidth;
    }

    setRAMSize(ramSize) {
        this.ramSize = ramSize;
    }

    setCPUCores(cpuCores) {
        this.cpuCores = cpuCores;
    }

    enableSSL() {
        this.SSL = true;
    }

    disableSSL() {
        this.SSL = false;
    }

    enableBackup() {
        this.backupEnabled = true;
    }

    disableBackup() {
        this.backupEnabled = false;
    }

    setUptimeGuarantee(uptimeGuarantee) {
        this.uptimeGuarantee = uptimeGuarantee;
    }

    setPricePerMonth(pricePerMonth) {
        this.pricePerMonth = pricePerMonth;
    }
}

class VPSHost extends Host {
    constructor(name, provider, operatingSystem, controlPanel, password, network) {
        super(name, provider, 'VPS', operatingSystem);
        this.type = 'VPS Host';
        this.controlPanel = controlPanel;
        this.rootAccess = true;
        this.dedicatedIP = true;
        this.scalability = true;
        this.snapshots = true;
        this.apiAccess = true;
        this.hostPassword = password;
    }

    setControlPanel(controlPanel) {
        this.controlPanel = controlPanel;
    }

    hostPassword() {
        return this.hostPassword;
    }

    enableRootAccess() {
        this.rootAccess = true;
    }

    disableRootAccess() {
        this.rootAccess = false;
    }

    enableDedicatedIP() {
        this.dedicatedIP = true;
    }

    disableDedicatedIP() {
        this.dedicatedIP = false;
    }

    enableScalability() {
        this.scalability = true;
    }

    disableScalability() {
        this.scalability = false;
    }

    enableSnapshots() {
        this.snapshots = true;
    }

    disableSnapshots() {
        this.snapshots = false;
    }

    enableAPIAccess() {
        this.apiAccess = true;
    }

    disableAPIAccess() {
        this.apiAccess = false;
    }

    localhost() {
        if (typeof network === 'undefined') {
            console.log('Network class not found. Running web server locally.');
            // Code to run the web server on localhost
            // ...
        } else {
            console.log('Network class found. Skipping localhost.');
            // Code to interact with the Network class, if needed
            // ...
        }
    }
}



class DNSRRSet {
    constructor(records = []) {
        this.records = records;
    }

    addRecord(record) {
        this.records.push(record);
    }

    removeRecord(record) {
        const index = this.records.indexOf(record);
        if (index !== -1) {
            this.records.splice(index, 1);
        }
    }

    getRecords() {
        return this.records;
    }
}


class User {
    constructor(username, uid, gid, homeDir, shell, password, groups, accountExpiration, passwordExpiration, configFiles, acls, sshKeys) {
        this.username = username;
        this.uid = uid;
        this.gid = gid;
        this.homeDir = homeDir;
        this.shell = shell;
        this.password = password;
        this.groups = groups;
        this.accountExpiration = accountExpiration;
        this.passwordExpiration = passwordExpiration;
        this.configFiles = configFiles;
        this.acls = acls;
        this.sshKeys = sshKeys;
    }

    id() {
        return `UID: ${this.uid}, GID: ${this.gid}, Groups: ${this.groups.join(', ')}`;
    }

    getUsername() {
        return `Username: ${this.username}`;
    }

    listPasswordExpiration() {
        return `Password Expiration: ${this.passwordExpiration}`;
    }
};


// Get the current date and time in Mountain Time (Denver)
const currentDate = new Date();

// Create a new Date object for one year from today
const oneYearFromNow = new Date(
    currentDate.getFullYear() + 1,
    currentDate.getMonth(),
    currentDate.getDate()
);

// Set the time zone to Mountain Time (Denver)
const denverTimeZone = 'America/Denver';
const denverDate = new Date(
    oneYearFromNow.toLocaleString('en-US', { timeZone: denverTimeZone })
);

class SanityStudio {
    constructor(projectId, dataset) {
        this.projectId = projectId;
        this.dataset = dataset;
        this.schema = [];
        this.documents = [];
        this.assets = [];
        this.apiEndpoint = `https://${projectId}.api.sanity.io/v1/data/query/${dataset}`;
    }

    addSchemaType(schemaType) {
        this.schema.push(schemaType);
    }

    addDocument(document) {
        this.documents.push(document);
    }

    addAsset(asset) {
        this.assets.push(asset);
    }

    configureStudio(config) {
        this.studioConfig = config;
    }

    deployStudio() {
        console.log(`Deploying Sanity Studio for project ${this.projectId}`);
        // Deployment logic would go here
    }

    queryContent(query) {
        console.log(`Querying content: ${query}`);
        // API query logic would go here
    }
};

// Create an instance of the VPSHost class
const vpsHosting = new VPSHost('My VPS', 'DigitalOcean', 'Ubuntu', 'cPanel', 'ze=lz0fUp#pL$aH@cRa8e');
let rootUser = new User('root', '0', '0', 'root', 'ze=lz0fUp#pL$aH@cRa8e');

// Set properties specific to the VPSHost class
vpsHosting.setIPAddress('192.168.0.1');
vpsHosting.setDiskSpace(50); // in GB
vpsHosting.setBandwidth(1000); // in GB
vpsHosting.setRAMSize(4); // in GB
vpsHosting.setCPUCores(2);
vpsHosting.enableSSL();
vpsHosting.enableBackup();
vpsHosting.setUptimeGuarantee(99.9);
vpsHosting.setPricePerMonth(50);


class Domain {
    constructor(name, tld, registrar, registrationDate, expirationDate) {
        this.name = name;
        this.tld = tld;
        this.registrar = registrar;
        this.registrationDate = registrationDate;
        this.expirationDate = expirationDate;
        this.nameServers = [];
        this.dnsRecords = [];
        this.sslCertificate = null;
        this.autoRenew = false;
        this.privacyProtection = false;
        this.registrantContact = {};
        this.adminContact = {};
        this.technicalContact = {};
        this.billingContact = {};
        this.dnsRRSets = {};
    }



    addNameServer(nameServer) {
        this.nameServers.push(nameServer);
    }

    addDnsRecord(dnsRecord) {
        this.dnsRecords.push(dnsRecord);
    }

    setSSLCertificate(sslCertificate) {
        this.sslCertificate = sslCertificate;
    }

    enableAutoRenew() {
        this.autoRenew = true;
    }

    disableAutoRenew() {
        this.autoRenew = false;
    }

    enablePrivacyProtection() {
        this.privacyProtection = true;
    }

    disablePrivacyProtection() {
        this.privacyProtection = false;
    }

    setRegistrantContact(contact) {
        this.registrantContact = contact;
    }

    setAdminContact(contact) {
        this.adminContact = contact;
    }

    setTechnicalContact(contact) {
        this.technicalContact = contact;
    }

    setBillingContact(contact) {
        this.billingContact = contact;
    }

    addDNSRecord(record) {
        const { name, type } = record;
        if (!this.dnsRRSets[name]) {
            this.dnsRRSets[name] = {};
        }
        if (!this.dnsRRSets[name][type]) {
            this.dnsRRSets[name][type] = new DNSRRSet();
        }
        this.dnsRRSets[name][type].addRecord(record);
    }

    removeDNSRecord(record) {
        const { name, type } = record;
        if (this.dnsRRSets[name] && this.dnsRRSets[name][type]) {
            this.dnsRRSets[name][type].removeRecord(record);
            if (this.dnsRRSets[name][type].getRecords().length === 0) {
                delete this.dnsRRSets[name][type];
            }
            if (Object.keys(this.dnsRRSets[name]).length === 0) {
                delete this.dnsRRSets[name];
            }
        }
    }

    getDNSRecords(name, type) {
        if (this.dnsRRSets[name] && this.dnsRRSets[name][type]) {
            return this.dnsRRSets[name][type].getRecords();
        }
        return [];
    }
}

//username, uid, gid, homeDir, shell, password, groups, accountExpiration, passwordExpiration, configFiles, acls, sshKeys
let thrawnUser = new User('thrawn', '1000', '1000', 'thrawn', 'joQE!r5&_eDIBrif8a2W');

let nodev = 'nvm install 20.14.0';
let nvmver = 'nvm use 20.14.0';
let sshpassword = 'joQE!r5&_eDIBrif8a2W';

//name, tld, registrar, registrationDate, expirationDate
const domain = new Domain('blackmesafuels.com', 'com', 'ExampleRegistrar', '2023-01-01', '2024-01-01');

const aRecord = new ARecord('example.com', 3600, '192.0.2.1');
const cnameRecord = new CNAMERecord('www', 3600, 'example.com');
const mxRecord = new MXRecord('example.com', 3600, 10, 'mail.example.com');
const txtRecord = new TXTRecord('example.com', 3600, 'v=spf1 include:_spf.example.com ~all');

domain.addDNSRecord(aRecord);
domain.addDNSRecord(cnameRecord);
domain.addDNSRecord(mxRecord);
domain.addDNSRecord(txtRecord);



const localHost = new Host('LocalHost', '127.0.0.1'); // Loopback address for local development

const localNetwork = new StarNetwork(connection); // Simplified representation for local communication




class PM2 {
  constructor() {
    this.version = '5.2.2'; // Example version, update as needed

    // Process Management
    this.processManagement = {
      start: (app) => {},
      stop: (app) => {},
      restart: (app) => {},
      list: () => {},
      describe: (app) => {},
      monit: () => {}
    };

    // Monitoring
    this.monitoring = {
      cpu: true,
      memory: true,
      http: true,
      customMetrics: []
    };

    // Load Balancing
    this.loadBalancing = {
      enabled: true,
      instances: 'max' // Can be a number or 'max' for all CPUs
    };

    // Logging
    this.logging = {
      logRotation: true,
      maxSize: '10M',
      compress: true,
      dateFormat: 'YYYY-MM-DD_HH-mm-ss'
    };

    // Deployment
    this.deployment = {
      updateMethod: 'rolling',
      zeroDowntime: true
    };

    // Clustering
    this.clustering = {
      enabled: true,
      execMode: 'cluster_mode'
    };

    // Environment Management
    this.environments = {
      development: {},
      production: {},
      staging: {}
    };

    // API
    this.api = {
      endpoint: '/api',
      port: 9615
    };

    // CLI
    this.cli = {
      commands: ['start', 'stop', 'restart', 'list', 'monit', 'logs', 'flush', 'reload', 'delete', 'save', 'startup']
    };

    // Startup Scripts
    this.startupScripts = {
      generate: (platform) => {},
      supported: ['systemd', 'upstart', 'launchd', 'rcd']
    };

    // Module System
    this.modules = {
      list: [],
      install: (module) => {},
      uninstall: (module) => {}
    };
  }

  // Example method to demonstrate starting an app
  startApp(appName, options = {}) {
    console.log(`Starting ${appName} with PM2...`);
    // Implementation details would go here
  }

  // Example method to demonstrate monitoring
  enableMonitoring(options = {}) {
    console.log('Enabling PM2 monitoring...');
    // Implementation details would go here
  }

  // Example method to demonstrate load balancing
  setupLoadBalancing(instances = 'max') {
    console.log(`Setting up load balancing with ${instances} instances`);
    // Implementation details would go here
  }
};

let stalkingSunshine_pm2 = new PM2();
console.log('trump got shot');
let pm2_local_binary_path = "/home/thrawn/node_modules/.bin/pm2 list";
let googleworksapceadminaccountemail = "nataani@blackmesafuels.com";
let googleworkspaceaccountPassword ='DrearilyDebtlessGroinRegulateOverripePelican';
let googleWorkspaceAdmin = 'nataani';
let wtf ='DrearilyDebtlessGroinRegulateOverripePelican';
let googleWorkspaceAddress ='920 E HWY 66 GALLUP NM   87301  ';
let googleworkspaceBillingAddress = '10500 Condor Drive NW 87114';
let github_ssh_passphrase = 'GrinchHerbicidePrancingUnlockedPatriotHypocrisy';


let wewd = 'nataanibebetter@gmail.com';
let domainObj = {
    googleAccountPurchase: 'newfoundnataani@yahoo.com',
    first_Name: 'newfoundnataani',
    phoneNumber: '5052069838',
    streetAdress: '10500 Condor Dr NW',
    city: 'Albuquerque',
    state: 'NM',
    postalCode: '87114',
    country: 'United States',
    hosting: vpsHosting,

};

// Function to calculate monthly finances
function calculateMonthlyFinances(financesObject) {
  let totalExpenses = 0;
  let totalIncome = 0;

  // Iterate through the object
  for (const [name, amount] of Object.entries(financesObject)) {
    if (typeof amount === 'number') {
        console.log(`heres the name: ${name}`);
        console.log(`heres the amount: ${amount}`);
      if (amount < 0) {
        totalExpenses += Math.abs(amount);
      } else {
        totalIncome += amount;
      }
    }
  }

  const netResult = totalIncome - totalExpenses;

  return {
    totalExpenses,
    totalIncome,
    netResult
  };
}

// Example usage
const monthlyFinances = {
  'Salary': 3000,
  'Rent': -1000,
  'Utilities': -200,
  'Groceries': -400,
  'Freelance Income': 500,
  'Internet': -50,
  'Phone': -40
};

let mysql_password = 'SatiricalRoboticsSuffererUntieCornhuskJugularSimply';
let mysql_aang_password = 'SabbathUnwellFounderUnstylishElmEntourageExact';

const result = calculateMonthlyFinances(monthlyFinances);

console.log('Total Expenses:', result.totalExpenses);
console.log('Total Income:', result.totalIncome);
console.log('Net Result:', result.netResult);

let black_mesa_fuels_monthly_expenses = {
    'stalkingSunshine_digitalocean_droplet_backup': -7.20,
    'stalkingSunshine_digitalocean_droplet_cost': -36.00,
    'blackmesafuels_googleworkspace_business_standard': -14.40, 
};

let monthlyCharges = {
    january: {
      services: [
        {
          name: "Digital Ocean Droplet",
          unitPrice: 24.0,
          quantity: 1
        },
        {
          name: "Digital Ocean Backup",
          unitPrice: 7.2,
          quantity: 1
        },
        {
          // New Google Workspace base cost of $14.40
          name: "Google Workspace",
          unitPrice: 14.40,
          quantity: 1
        },
        {
          // Optional: Add a management fee line item
          name: "Management Fee",
          unitPrice: 25.0,
          quantity: 1
        }
      ],
      taxRules: [
        // Same original tax rules for Digital Ocean services
        {
          name: "Gross Receipts and Compensating Tax",
          rate: 0.04875, // 4.875%
          appliesTo: ["Digital Ocean Droplet", "Digital Ocean Backup"] 
        },
        {
          name: "Local Gross Receipts Tax 1",
          rate: 0.011875, // 1.1875%
          appliesTo: ["Digital Ocean Droplet", "Digital Ocean Backup"]
        },
        {
          name: "Local Gross Receipts Tax 2",
          rate: 0.015625, // 1.5625%
          appliesTo: ["Digital Ocean Droplet", "Digital Ocean Backup"]
        },
        // New Google Workspace taxes
        {
          name: "State Sales Tax (Google Workspace)",
          rate: 0.04875, // 4.875%
          appliesTo: ["Google Workspace"]
        },
        {
          name: "Local Sales Tax (Google Workspace)",
          rate: 0.03188, // ~3.188%
          appliesTo: ["Google Workspace"]
        }
        // If you want the Management Fee to be taxed as well,
        // you can add lines like:
        // {
        //   name: "Some Tax for Management Fee",
        //   rate: 0.XX,
        //   appliesTo: ["Management Fee"]
        // }
      ]
      // totals (calculated later by computeMonthlyCharges)
    },
    // Repeat similarly for february, march, etc.
  };


  function computeMonthlyCharges(charges) {
    for (let month in charges) {
      if (charges.hasOwnProperty(month)) {
        const monthData = charges[month];
        let totalMonthBeforeTax = 0;
        let totalMonthTax = 0;

        for (let service of monthData.services) {
          // Calculate the total before tax for this service
          service.totalBeforeTax = service.unitPrice * service.quantity;

          // Determine which taxes apply to this service
          let applicableTaxes = monthData.taxRules.filter(taxRule => 
            taxRule.appliesTo.includes(service.name)
          );

          // Calculate the tax breakdown for each applicable tax
          let taxBreakdown = [];
          let serviceTotalTax = 0;

          for (let taxRule of applicableTaxes) {
            let taxAmount = service.totalBeforeTax * taxRule.rate;
            taxBreakdown.push({
              taxName: taxRule.name,
              taxRate: taxRule.rate,
              taxAmount: parseFloat(taxAmount.toFixed(2))
            });
            serviceTotalTax += taxAmount;
          }

          service.taxBreakdown = taxBreakdown;
          service.totalTax = parseFloat(serviceTotalTax.toFixed(2));
          service.totalWithTax = parseFloat((service.totalBeforeTax + service.totalTax).toFixed(2));

          totalMonthBeforeTax += service.totalBeforeTax;
          totalMonthTax += service.totalTax;
        }

        monthData.totalBeforeTax = parseFloat(totalMonthBeforeTax.toFixed(2));
        monthData.totalTax = parseFloat(totalMonthTax.toFixed(2));
        monthData.totalDue = parseFloat((totalMonthBeforeTax + totalMonthTax).toFixed(2));
      }
    }
    return charges;
  }

  // Example usage:
  let updatedMonthlyCharges = computeMonthlyCharges(monthlyCharges);
  console.log(JSON.stringify(updatedMonthlyCharges, null, 2));






let blackmesafuels_monthlycost = calculateMonthlyFinances(black_mesa_fuels_monthly_expenses);


// possible seo services
 
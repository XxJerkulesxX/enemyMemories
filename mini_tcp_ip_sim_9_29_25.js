/***************
 * Mini Net Stack: Client <-> Network <-> Server
 * - DevTools-style HTTP/2 pseudo headers (client)
 * - Teaching HTTP/1.1 wire text (so we can parse on server)
 * - TCP segmentation + IPv4 encapsulation (simplified)
 * - Reassembly on receive
 ***************/

// ---------- utils ----------
const enc = new TextEncoder();
const dec = new TextDecoder();
const toBytes = (s) => enc.encode(s);
const hex = (n, w=2) => '0x' + (n>>>0).toString(16).toUpperCase().padStart(w,'0');
const ipToBytes = (ip) => ip.split('.').map(n => (Number(n)&255));

// Internet checksum (header only, 16-bit one's complement). We compute it; we don’t validate on rx.
function ipChecksum(bytes) {
  let sum = 0;
  for (let i=0; i<bytes.length; i+=2) {
    const word = ((bytes[i]<<8) | (bytes[i+1] ?? 0)) >>> 0;
    sum += word;
    sum = (sum & 0xFFFF) + (sum >>> 16);
  }
  return (~sum) & 0xFFFF;
}

// ---------- IPv4 ----------
class IPv4Header {
  constructor({
    src='10.0.0.2', dst='104.18.32.47', dscp=0, ecn=0,
    id=0x1000, df=true, mf=false, fragOffset=0,
    ttl=64, protocol=6 /*TCP*/, optionsBytes=new Uint8Array([])
  } = {}) {
    this.version = 4;
    this.ihl = 5 + Math.ceil(optionsBytes.length/4); // 5 => 20B
    this.dscp = dscp & 0x3F;
    this.ecn  = ecn & 0x03;
    this.totalLength = 0; // filled when packing
    this.id = id & 0xFFFF;
    this.df = !!df; this.mf = !!mf; this.fragOffset = fragOffset & 0x1FFF;
    this.ttl = ttl & 0xFF;
    this.protocol = protocol & 0xFF;
    this.headerChecksum = 0;
    this.src = src; this.dst = dst;
    this.optionsBytes = optionsBytes;
  }
  pack(payload) {
    const hdrLen = this.ihl * 4;
    const b = new Uint8Array(hdrLen);
    b[0] = (4<<4) | (this.ihl & 0x0F);
    b[1] = (this.dscp<<2) | this.ecn;
    const total = hdrLen + payload.length;
    b[2] = (total>>8)&0xFF; b[3] = total&0xFF;
    b[4] = (this.id>>8)&0xFF; b[5] = this.id&0xFF;
    const flags = ((0<<2) | (this.df?1:0)<<1 | (this.mf?1:0)) & 0x7;
    const fragField = ((flags<<13) | this.fragOffset) & 0xFFFF;
    b[6] = (fragField>>8)&0xFF; b[7] = fragField&0xFF;
    b[8] = this.ttl; b[9] = this.protocol;
    b[10] = 0; b[11]=0; // checksum placeholder
    const s = ipToBytes(this.src), d = ipToBytes(this.dst);
    b[12]=s[0]; b[13]=s[1]; b[14]=s[2]; b[15]=s[3];
    b[16]=d[0]; b[17]=d[1]; b[18]=d[2]; b[19]=d[3];
    if (this.ihl>5 && this.optionsBytes.length) b.set(this.optionsBytes, 20);
    const sum = ipChecksum(b);
    b[10] = (sum>>8)&0xFF; b[11] = sum&0xFF;
    return b;
  }
  static parse(b) {
    const ver = b[0]>>4, ihl = b[0]&0x0F;
    const dscp = b[1]>>2, ecn = b[1]&0x03;
    const totalLength = (b[2]<<8)|b[3];
    const id = (b[4]<<8)|b[5];
    const flagsFrag = (b[6]<<8)|b[7];
    const df = !!((flagsFrag>>14)&1);
    const mf = !!((flagsFrag>>13)&1);
    const fragOffset = flagsFrag & 0x1FFF;
    const ttl = b[8], proto = b[9];
    const src = `${b[12]}.${b[13]}.${b[14]}.${b[15]}`;
    const dst = `${b[16]}.${b[17]}.${b[18]}.${b[19]}`;
    return {ver, ihl, dscp, ecn, totalLength, id, df, mf, fragOffset, ttl, proto, src, dst};
  }
}

// ---------- TCP (simplified; no real checksum/pseudo-header) ----------
class TCPHeader {
  constructor({
    srcPort=53000, dstPort=443, seq=1, ack=1,
    dataOffsetWords=5, // 20 bytes
    flags={ns:0,cwr:0,ecn:0,urg:0,ack:1,psh:1,rst:0,syn:0,fin:0},
    windowSize=65535, urgentPtr=0, optionsBytes=new Uint8Array([])
  } = {}) {
    this.srcPort = srcPort; this.dstPort = dstPort;
    this.seq = seq>>>0; this.ack = ack>>>0;
    this.dataOffsetWords = dataOffsetWords + Math.ceil(optionsBytes.length/4);
    this.flags = flags;
    this.windowSize = windowSize & 0xFFFF;
    this.checksum = 0; // not computed here
    this.urgentPtr = urgentPtr & 0xFFFF;
    this.optionsBytes = optionsBytes;
  }
  pack(payload) {
    const hdrBytes = this.dataOffsetWords * 4;
    const b = new Uint8Array(hdrBytes);
    b[0]=(this.srcPort>>8)&0xFF; b[1]=this.srcPort&0xFF;
    b[2]=(this.dstPort>>8)&0xFF; b[3]=this.dstPort&0xFF;
    for (let i=0;i<4;i++) b[4+i] = (this.seq >>> (24-8*i)) & 0xFF;
    for (let i=0;i<4;i++) b[8+i] = (this.ack >>> (24-8*i)) & 0xFF;
    b[12] = (this.dataOffsetWords<<4)&0xF0;
    let f = this.flags;
    b[13] =
      ((f.ns?1:0)<<7) |
      ((f.cwr?1:0)<<7) |
      ((f.ecn?1:0)<<6) |
      ((f.urg?1:0)<<5) |
      ((f.ack?1:0)<<4) |
      ((f.psh?1:0)<<3) |
      ((f.rst?1:0)<<2) |
      ((f.syn?1:0)<<1) |
      ((f.fin?1:0)<<0);
    b[14]=(this.windowSize>>8)&0xFF; b[15]=this.windowSize&0xFF;
    b[16]=0; b[17]=0; // checksum placeholder
    b[18]=(this.urgentPtr>>8)&0xFF; b[19]=this.urgentPtr&0xFF;
    if (this.dataOffsetWords>5 && this.optionsBytes.length) b.set(this.optionsBytes,20);
    return b;
  }
  static parse(b) {
    const srcPort = (b[0]<<8)|b[1];
    const dstPort = (b[2]<<8)|b[3];
    const dataOffsetWords = (b[12]>>4)&0x0F;
    const flags = b[13];
    const windowSize = (b[14]<<8)|b[15];
    return {srcPort, dstPort, dataOffsetBytes: dataOffsetWords*4, flagsHex: hex(flags), windowSize};
  }
}

// ---------- HTTP helpers ----------
function h2ToHttp11(dev) {
  const host = dev[':authority'];
  const method = dev[':method'];
  const path = dev[':path'];
  const headers = {
    'Host': host,
    'Connection': 'keep-alive',
    'Accept': dev['accept'],
    'Accept-Encoding': dev['accept-encoding'],
    'Accept-Language': dev['accept-language'],
    'Origin': dev['origin'],
    'Referer': dev['referer'],
    'User-Agent': dev['user-agent'],
    'Content-Type': dev['content-type'],
    'Content-Length': dev['content-length'],
  };
  const lines = [`${method} ${path} HTTP/1.1`];
  for (const [k,v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
  lines.push('', ''); // no body for brevity
  return lines.join('\r\n');
}

function parseHttpRequest(text) {
  const [head] = text.split('\r\n\r\n');
  const lines = head.split('\r\n');
  const [method, path, version] = lines[0].split(' ');
  const headers = {};
  for (let i=1;i<lines.length;i++) {
    if (!lines[i]) continue;
    const idx = lines[i].indexOf(':');
    if (idx>0) headers[lines[i].slice(0,idx).trim().toLowerCase()] = lines[i].slice(idx+1).trim();
  }
  return {method, path, version, headers};
}

function buildHttpResponse({status=202, reason='Accepted', headers={}, body=''}) {
  const head = [`HTTP/1.1 ${status} ${reason}`];
  for (const [k,v] of Object.entries(headers)) head.push(`${k}: ${v}`);
  head.push('', body);
  return head.join('\r\n');
}

// ---------- Network (toy: immediate delivery) ----------
class NetworkLink {
  constructor(name) { this.name = name; this.rx = null; }
  connect(receiver) { this.rx = receiver; }
  send(frameBytes) { this.rx && this.rx(frameBytes); }
}

// ---------- Server ----------
class Server {
  constructor({ip='104.18.32.47', port=443, link}) {
    this.ip = ip; this.port = port; this.link = link;
    this.reassembly = []; // store payload chunks
    link.connect((bytes)=>this.onFrame(bytes));
  }
  onFrame(bytes) {
    // Parse IPv4
    const ip = IPv4Header.parse(bytes);
    const ipHdrLen = ip.ihl*4;
    const tcpBytes = bytes.slice(ipHdrLen);
    // Parse TCP
    const tcp = TCPHeader.parse(tcpBytes);
    const payload = tcpBytes.slice(tcp.dataOffsetBytes);

    // Wireshark-ish log
    console.log(`\n[Server RX] IPv4 {ver=${ip.ver}, IHL=${ip.ihl*4}B, TotalLen=${ip.totalLength}, ID=${hex(ip.id,4)}, DF=${ip.df}, MF=${ip.mf}, TTL=${ip.ttl}, Proto=${ip.proto}, Src=${ip.src}, Dst=${ip.dst}}`);
    console.log(`[Server RX] TCP  {SrcPort=${tcp.srcPort}, DstPort=${tcp.dstPort}, Flags=${tcp.flagsHex}, Win=${tcp.windowSize}}`);
    if (payload.length) console.log(`[Server RX] Payload bytes: ${payload.length}`);

    // Reassemble HTTP text (teaching plaintext)
    this.reassembly.push(payload);
    const all = concat(this.reassembly);
    const text = safeDecode(all);
    if (text.includes('\r\n\r\n')) {
      // Parse HTTP
      const req = parseHttpRequest(text);
      console.log(`\n[Server] Parsed HTTP request: ${req.method} ${req.path} ${req.version}`);
      console.table(req.headers);

      // Build response (DevTools-like)
      const body = JSON.stringify({ok:true, ts: Date.now()});
      const resp = buildHttpResponse({
        status: 202,
        reason: 'Accepted',
        headers: {
          'content-type': 'application/json',
          'content-length': String(body.length),
          'access-control-allow-origin': '*',
          'strict-transport-security': 'max-age=31536000; includeSubDomains; preload'
        },
        body
      });
      // Send it back
      this.sendResponse(resp, ip.src, tcp.srcPort);
    }
  }
  sendResponse(httpText, dstIp, dstPort) {
    const bytes = toBytes(httpText);
    const mss = 700;
    const segments = segment(bytes, mss);
    let seq = 50000, ack = 20000;
    segments.forEach((pl, i) => {
      const tcpHdr = new TCPHeader({
        srcPort: this.port, dstPort, seq, ack,
        flags: {ack:1, psh:1, fin: (i===segments.length-1)?1:0}
      }).pack(pl);
      const tcpPacket = cat(tcpHdr, pl);
      const ipHdr = new IPv4Header({
        src: this.ip, dst: dstIp, id: 0xB000+i, df:true, mf:false, ttl:64, protocol:6
      }).pack(tcpPacket);
      const frame = cat(ipHdr, tcpPacket);
      // “wire”
      setTimeout(()=> this.linkBack.send(frame), 1+i); // async-ish
    });
  }
  attachReturn(linkBack) { this.linkBack = linkBack; }
}

// ---------- Client ----------
class Client {
  constructor({ip='10.0.0.2', port=53000, link}) {
    this.ip = ip; this.port = port; this.link = link;
    this.inbox = [];
    link.connect((bytes)=>this.onFrame(bytes));
  }
  onFrame(bytes) {
    const ip = IPv4Header.parse(bytes);
    const ipHdrLen = ip.ihl*4;
    const tcpBytes = bytes.slice(ipHdrLen);
    const tcp = TCPHeader.parse(tcpBytes);
    const payload = tcpBytes.slice(tcp.dataOffsetBytes);

    console.log(`\n[Client RX] IPv4 {ver=${ip.ver}, IHL=${ip.ihl*4}B, TotalLen=${ip.totalLength}, ID=${hex(ip.id,4)}, TTL=${ip.ttl}, Src=${ip.src}, Dst=${ip.dst}}`);
    console.log(`[Client RX] TCP  {SrcPort=${tcp.srcPort}, DstPort=${tcp.dstPort}, Flags=${tcp.flagsHex}}`);
    if (payload.length) console.log(`[Client RX] Payload bytes: ${payload.length}`);

    this.inbox.push(payload);
    const all = concat(this.inbox);
    const text = safeDecode(all);
    if (text.includes('\r\n\r\n')) {
      const [head, body] = text.split('\r\n\r\n');
      const lines = head.split('\r\n');
      const status = lines[0];
      const headers = {};
      for (let i=1;i<lines.length;i++) {
        const idx = lines[i].indexOf(':');
        if (idx>0) headers[lines[i].slice(0,idx)] = lines[i].slice(idx+1).trim();
      }
      console.log('\n=== Client “DevTools” View (Response) ===');
      console.log('General:', {Status: status});
      console.log('Response Headers:', headers);
      console.log('Preview:', body);
    }
  }
  send(devtoolsH2, dstHostIp, dstPort=443) {
    // DevTools-ish “General”
    console.log('\n=== Client “DevTools” View (Request) ===');
    console.log('General:', {
      'Request URL': `https://${devtoolsH2[':authority']}${devtoolsH2[':path']}`,
      'Request Method': devtoolsH2[':method'],
      'Remote Address': `${dstHostIp}:${dstPort}`,
    });
    console.log('Request Headers:', devtoolsH2);

    // Build teaching HTTP/1.1 text (so server can parse)
    const http = h2ToHttp11(devtoolsH2);
    console.log('\n[Client] Teaching HTTP/1.1 request (plaintext):\n' + http);

    // Segment, wrap TCP+IP, send
    const bytes = toBytes(http);
    const mss = 600;
    const segments = segment(bytes, mss);
    let seq = 20000, ack = 10000;
    segments.forEach((pl, i) => {
      const tcpHdr = new TCPHeader({
        srcPort: this.port, dstPort, seq, ack,
        flags: {ack:1, psh:1, fin:(i===segments.length-1)?1:0}
      }).pack(pl);
      const tcpPacket = cat(tcpHdr, pl);
      const ipHdr = new IPv4Header({
        src: this.ip, dst: dstHostIp, id: 0xA000+i, df:true, mf:false, ttl:64, protocol:6
      }).pack(tcpPacket);
      const frame = cat(ipHdr, tcpPacket);

      // Wireshark-ish log (tx)
      const ipParsed = IPv4Header.parse(ipHdr);
      const tcpParsed = TCPHeader.parse(tcpHdr);
      console.log(`\n[Client TX] IPv4 {ver=4, IHL=${ipParsed.ihl*4}B, TotalLen=${ipParsed.totalLength}, ID=${hex(ipParsed.id,4)}, DF=${ipParsed.df}, TTL=${ipParsed.ttl}, Src=${ipParsed.src}, Dst=${ipParsed.dst}}`);
      console.log(`[Client TX] TCP  {SrcPort=${tcpParsed.srcPort}, DstPort=${tcpParsed.dstPort}, Flags=${tcpParsed.flagsHex}}`);
      console.log(`[Client TX] Payload (first 80 chars): ${JSON.stringify(dec.decode(pl).slice(0,80))}`);

      // “wire”
      setTimeout(()=> this.link.send(frame), i); // async-ish
    });
  }
}

// ---------- helpers ----------
function segment(bytes, mss) {
  const out = [];
  for (let i=0;i<bytes.length;i+=mss) out.push(bytes.slice(i, i+mss));
  return out;
}
const cat = (a,b) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a,0); out.set(b,a.length);
  return out;
};
const concat = (arr) => {
  const len = arr.reduce((n,b)=>n+b.length, 0);
  const out = new Uint8Array(len);
  let o=0; for (const b of arr) { out.set(b,o); o+=b.length; }
  return out;
};
function safeDecode(bytes) {
  try { return dec.decode(bytes); } catch { return ''; }
}

// ---------- demo main ----------
(function main(){
  // “DevTools” style request (HTTP/2 pseudo-headers)
  const devtoolsH2 = {
    ':authority': 'ab.chatgpt.com',
    ':method': 'POST',
    ':path': '/v1/rgstr?k=client-…&gz=1',
    ':scheme': 'https',
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'origin': 'https://chatgpt.com',
    'priority': 'u=1, i',
    'referer': 'https://chatgpt.com/',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'content-length': '1080',
    'content-type': 'application/json'
  };

  // Wire up links
  const linkClientToServer = new NetworkLink('c->s');
  const linkServerToClient = new NetworkLink('s->c');

  const server = new Server({ip:'104.18.32.47', port:443, link: linkClientToServer});
  server.attachReturn(linkServerToClient);
  const client = new Client({ip:'10.0.0.2', port:53000, link: linkServerToClient});

  // Client “sends” to server IP:443
  client.send(devtoolsH2, '104.18.32.47', 443);
})();

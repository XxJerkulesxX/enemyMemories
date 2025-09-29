
/* Mini “DevTools → Wire” simulator
 * - Builds an HTTP request from DevTools-style fields
 * - Serializes to HTTP/1.1 ASCII (teaching only)
 * - Segments into TCP, encapsulates into IPv4 packets
 * - Prints a mapping from DevTools to wire-ish fields
 */

// ---------- Utilities ----------
const toBytes = (s) => new TextEncoder().encode(s);
const hex = (n, w=2) => '0x' + n.toString(16).padStart(w,'0').toUpperCase();
const ipToBytes = (ip) => ip.split('.').map(x=>Number(x)&255);

// Internet checksum of header (16-bit 1’s complement)
function ipChecksum(bytes) {
  let sum = 0;
  for (let i=0; i<bytes.length; i+=2) {
    const word = (bytes[i]<<8) + (bytes[i+1] ?? 0);
    sum += word;
    sum = (sum & 0xFFFF) + (sum >>> 16); // fold
  }
  return (~sum) & 0xFFFF;
}

// ---------- “DevTools” HTTP/2-ish fields (pseudo-headers) ----------
const devtoolsH2 = {
  ':authority': 'ab.chatgpt.com',
  ':method': 'POST',
  ':path': '/v1/rgstr?k=client-…&gz=1', // truncated for brevity
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
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'content-length': '1080',
  'content-type': 'application/json'
};

// ---------- Build an HTTP/1.1 request (teaching stand-in for HTTP/2) ----------
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
  // Serialize
  const lines = [`${method} ${path} HTTP/1.1`];
  for (const [k,v] of Object.entries(headers)) lines.push(`${k}: ${v}`);
  lines.push('', ''); // empty line before body (no body bytes here for brevity)
  return lines.join('\r\n');
}

// ---------- TCP + IPv4 “encapsulation” ----------
class IPv4Header {
  constructor({
    src='10.0.0.2', dst='104.18.32.47', dscp=0, ecn=0,
    id=0x1234, flags={df:1, mf:0}, fragOffset=0,
    ttl=64, protocol=6 /*TCP*/, optionsBytes=new Uint8Array([])
  }={}) {
    this.version = 4;
    this.ihl = 5 + Math.ceil(optionsBytes.length/4); // 32-bit words
    this.dscp = dscp; this.ecn = ecn;
    this.totalLength = 0; // filled after payload known
    this.id = id & 0xFFFF;
    this.flags = flags; // {df, mf}
    this.fragOffset = fragOffset; // 13 bits
    this.ttl = ttl & 0xFF;
    this.protocol = protocol & 0xFF;
    this.headerChecksum = 0; // computed later
    this.src = src; this.dst = dst;
    this.optionsBytes = optionsBytes;
  }
  pack(payloadBytes) {
    const headerLenBytes = this.ihl * 4;
    const buf = new Uint8Array(headerLenBytes);
    // Byte 0: Version (4) + IHL (4)
    buf[0] = (this.version<<4) | (this.ihl & 0x0F);
    // Byte 1: DSCP (6) + ECN (2)
    buf[1] = ((this.dscp & 0x3F)<<2) | (this.ecn & 0x03);
    // Total Length (2)
    const total = headerLenBytes + payloadBytes.length;
    buf[2] = (total>>8)&0xFF; buf[3] = total&0xFF;
    // Identification (2)
    buf[4] = (this.id>>8)&0xFF; buf[5] = this.id&0xFF;
    // Flags (3 bits) + Fragment Offset (13 bits)
    const flagsBits = ((0<<2) | ((this.flags.df?1:0)<<1) | (this.flags.mf?1:0)) & 0x7;
    const fragField = ((flagsBits<<13) | (this.fragOffset & 0x1FFF)) & 0xFFFF;
    buf[6] = (fragField>>8)&0xFF; buf[7] = fragField&0xFF;
    // TTL, Protocol
    buf[8] = this.ttl; buf[9] = this.protocol;
    // Header checksum (temp 0)
    buf[10]=0; buf[11]=0;
    // Src/Dst
    const s = ipToBytes(this.src), d = ipToBytes(this.dst);
    buf[12]=s[0]; buf[13]=s[1]; buf[14]=s[2]; buf[15]=s[3];
    buf[16]=d[0]; buf[17]=d[1]; buf[18]=d[2]; buf[19]=d[3];
    // Options if any
    if (this.ihl>5 && this.optionsBytes.length) {
      buf.set(this.optionsBytes, 20);
    }
    // Checksum
    const sum = ipChecksum(buf);
    buf[10] = (sum>>8)&0xFF; buf[11] = sum&0xFF;
    return buf;
  }
}

class TCPHeader {
  constructor({
    srcPort=52344, dstPort=443, seq=1, ack=1,
    dataOffset=5, // 20 bytes, no options
    flags={syn:0, ack:1, psh:1, fin:0, rst:0, urg:0},
    windowSize=65535, checksum=0, urgentPtr=0, optionsBytes=new Uint8Array([])
  }={}) {
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.seq = seq>>>0;
    this.ack = ack>>>0;
    this.dataOffset = dataOffset + Math.ceil(optionsBytes.length/4);
    this.flags = flags;
    this.windowSize = windowSize & 0xFFFF;
    this.checksum = checksum; // not computed here (needs TCP pseudo-header)
    this.urgentPtr = urgentPtr & 0xFFFF;
    this.optionsBytes = optionsBytes;
  }
  pack(payloadBytes) {
    const hdrBytes = this.dataOffset * 4;
    const buf = new Uint8Array(hdrBytes);
    // Ports
    buf[0]=(this.srcPort>>8)&0xFF; buf[1]=this.srcPort&0xFF;
    buf[2]=(this.dstPort>>8)&0xFF; buf[3]=this.dstPort&0xFF;
    // Seq, Ack
    for (let i=0;i<4;i++) buf[4+i] = (this.seq >>> (24-8*i)) & 0xFF;
    for (let i=0;i<4;i++) buf[8+i] = (this.ack >>> (24-8*i)) & 0xFF;
    // DataOffset(4) + Reserved(3) + NS(1)
    buf[12] = (this.dataOffset<<4) & 0xF0;
    // Flags
    const f = this.flags;
    buf[13] =
      ((f.ns?1:0)<<7) |
      ((f.cwr?1:0)<<7) | // collapsed for brevity; common flags below
      ((f.ecn?1:0)<<6) |
      ((f.urg?1:0)<<5) |
      ((f.ack?1:0)<<4) |
      ((f.psh?1:0)<<3) |
      ((f.rst?1:0)<<2) |
      ((f.syn?1:0)<<1) |
      ((f.fin?1:0));
    // Window
    buf[14]=(this.windowSize>>8)&0xFF; buf[15]=this.windowSize&0xFF;
    // Checksum (0 here), Urgent pointer
    buf[16]=0; buf[17]=0;
    buf[18]=(this.urgentPtr>>8)&0xFF; buf[19]=this.urgentPtr&0xFF;
    if (this.dataOffset>5 && this.optionsBytes.length) buf.set(this.optionsBytes,20);
    return buf;
  }
}

// Split a byte array into segments of size <= MSS
function segment(bytes, mss=1200) {
  const segs = [];
  for (let i=0; i<bytes.length; i+=mss) {
    segs.push(bytes.slice(i, i+mss));
  }
  return segs;
}

// ---------- Build & “send” ----------
const http11Text = h2ToHttp11(devtoolsH2);
const httpBytes = toBytes(http11Text);

// Choose an MSS (payload per TCP segment, after TCP header)
const MSS = 600; // small so we get multiple segments
const tcpPayloads = segment(httpBytes, MSS);

// For each TCP segment, make a TCP header and then an IPv4 packet
let seq = 1000, ack = 5000;
const frames = tcpPayloads.map((pl, i) => {
  const tcp = new TCPHeader({
    seq: seq, ack: ack, flags: {syn:0, ack:1, psh:1, fin: i===tcpPayloads.length-1 ? 1 : 0}
  });
  const tcpHdr = tcp.pack(pl);
  const tcpBytes = new Uint8Array(tcpHdr.length + pl.length);
  tcpBytes.set(tcpHdr, 0);
  tcpBytes.set(pl, tcpHdr.length);

  const ip = new IPv4Header({ id: 0x1234 + i, flags:{df:1,mf:0}, ttl:64, protocol:6 });
  const ipHdr = ip.pack(tcpBytes);

  // “On the wire”: [Ethernet][IPv4 header][TCP header][HTTP bytes or TLS ciphertext]
  return {
    segNo: i+1,
    ipHeader: ipHdr,
    tcpHeader: tcpHdr,
    payloadPreview: new TextDecoder().decode(pl).slice(0,80)
  };
});

// ---------- Print a digest ----------
console.log('=== DevTools (HTTP/2 pseudo-headers) ===');
console.table(Object.entries(devtoolsH2).map(([k,v])=>({key:k, value:String(v).slice(0,80)})));

console.log('\n=== Teaching HTTP/1.1 request (plaintext) ===');
console.log(http11Text);

console.log('\n=== Simulated IPv4/TCP “frames” (what Wireshark would show at layers 3/4) ===');
for (const f of frames) {
  const ihl = f.ipHeader[0] & 0x0F;
  const totalLen = (f.ipHeader[2]<<8)|f.ipHeader[3];
  const id = (f.ipHeader[4]<<8)|f.ipHeader[5];
  const flagsFrag = ((f.ipHeader[6]<<8)|f.ipHeader[7]);
  const ttl = f.ipHeader[8];
  const proto = f.ipHeader[9];
  const src = `${f.ipHeader[12]}.${f.ipHeader[13]}.${f.ipHeader[14]}.${f.ipHeader[15]}`;
  const dst = `${f.ipHeader[16]}.${f.ipHeader[17]}.${f.ipHeader[18]}.${f.ipHeader[19]}`;

  console.log(`\n-- Segment ${f.segNo} --`);
  console.log(`IPv4: Version=4 IHL=${ihl*4}B TotalLen=${totalLen} ID=${hex(id,4)} Flags/Frag=${hex(flagsFrag,4)} TTL=${ttl} Proto=${proto} Src=${src} Dst=${dst}`);
  const dataOffset = (f.tcpHeader[12]>>4)&0x0F;
  const flags = f.tcpHeader[13];
  console.log(`TCP: SrcPort=${(f.tcpHeader[0]<<8)|f.tcpHeader[1]} DstPort=${(f.tcpHeader[2]<<8)|f.tcpHeader[3]} DataOffset=${dataOffset*4}B Flags=${hex(flags)} Window=${(f.tcpHeader[14]<<8)|f.tcpHeader[15]}`);
  console.log(`Payload (first 80 chars): ${JSON.stringify(f.payloadPreview)}`);
}

console.log('\nNOTE: In real HTTPS, the HTTP bytes above are TLS-encrypted, so Wireshark would show TLS records, not readable headers, unless you enable TLS decryption with keys.');

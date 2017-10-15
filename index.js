"use strict";

const net = require('net');
const colors = require('colors');
const simplerc4 = require('simple-rc4');
const util = require('util');
const crypto = require('./crypto');
const jsome = require('jsome');
const fs = require('fs');

require('jsbytes');

const config = {
	remote: "game.brawlstarsgame.com",
	port: 9339,
	key: "fhsd6f86f67rt8fw78fw789we78r9789wer6re",
	nonce: "nonce",
	dumpdir: "dump"
};



function split (buf) {
	let id = int.from_bytes(buf.slice(0,2), "big");
	let len = int.from_bytes(buf.slice(2,5), "big");
	let ver = int.from_bytes(buf.slice(5,7), "big");
	let payload = buf.slice(7);

	return {
		id, len, ver, payload
	}
}

class varbuffer {
	constructor (Buf = Buffer.alloc(0)) {
		this.Buffer = Buf;
		this.readOffset = 0;
		this.writeOffset = 0;
	}

	append (Buf) {
		this.Buffer = Buffer.concat([this.Buffer, Buf]);
		this.writeOffset += Buf.length;
	}

	prepend (Buf) {
		this.Buffer = Buffer.concat([Buf, this.Buffer]);
		this.writeOffset += Buf.length;
	}

	read (count = -1) {
		if (count == -1) {
			let result = this.Buffer.slice(this.readOffset);
			this.readOffset = this.Buffer.length;
			return result;
		} else {
			let result = this.Buffer.slice(this.readOffset, this.readOffset + count);
			this.readOffset += count;
			return result;
		}
	}

	toString (encoding) {
		return this.Buffer.toString(encoding);
	}
}

class peer {
	constructor (socket, destiny = null, name, callback) {
		this.history = new varbuffer;
		this.destiny = destiny;
		this.crypto = new crypto(config.key + config.nonce);
		this.name = name;
		this.digested = false;
		this.self = socket;

		this.self.on("data", data=>this.onData(data));
		this.self.on("close", ()=>this.onClose());
	}

	write (data) {
		this.self.write(data);
	}

	setDestiny (destiny) {
		this.destiny = destiny;
	}

	onData (data) {
		console.log("data", data);
		if (!this.destiny) {
			throw Error ("destiny not set");
			return false;
		}

		this.history.append(data);
		this.destiny.write(data);
	}

	onClose () {
		try {
			this.destiny.destroy();
		} catch (e) {}
		//console.log(this.history.toString("hex").cyan.underline);
		this.digest().forEach(message=>{
			fs.writeFileSync(`${config.dumpdir}/${this.name}/${Date.now()}_${message.id}.bin`, message.decrypted);
		})
		console.log("Closed", this.name);
	}

	digest () {
		if (this.digested) {
			throw Error ("Cannot digest twice!");
			return false;
		}

		this.digested = true;

		let result = [];
		let keepGoing = true;

		while (keepGoing) {
			if (this.history.readOffset == this.history.Buffer.length) {
				keepGoing = false;
				break;
			}
			var header = this.history.read(7);
			
			var id = int.from_bytes(header.slice(0, 2), "big");
			var length = int.from_bytes(header.slice(2, 5), "big");
			var ver = int.from_bytes(header.slice(5), "big");

			var payload = this.history.read(length);

			var decrypted = this.crypto.decrypt(payload);
			var decryptedhex = decrypted.toString('hex');

			result.push({
				id,
				length,
				ver,
				payload,
				decrypted,
				decryptedhex
			});
		}

		return result;
	}
}



let server = net.createServer();

server.on("connection", newClient);

function newClient (conn) {
	console.log(`[INFO] => New Client ${conn.remoteAddress}:${conn.remotePort}`.green.underline);
	let socket = net.createConnection(config.port, config.remote, ()=>{console.log(`[INFO] => Connected to gameserver ${config.remote}`.green.underline)});
	let server = new peer (socket, null, "server");

	let client = new peer (conn, socket, "client");
	server.setDestiny(client);
}

server.listen(config.port, "0.0.0.0", ()=>{console.log(`Proxy started on port ${config.port}`.cyan.underline)});


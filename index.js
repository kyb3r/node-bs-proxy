const net = require('net');
const colors = require('colors');
const simplerc4 = require('simple-rc4');
require('jsbytes');

const config = {
	remote: "game.brawlstarsgame.com",
	port: 9339,
	key: "fhsd6f86f67rt8fw78fw789we78r9789wer6re",
	nonce: "nonce"
};

let server = net.createServer();

class crypto {
	constructor () {
		this.rc4stream = new simplerc4(config.key + config.nonce);
		this.rc4stream.update(config.key + config.nonce);
	}

	decrypt (data) {
		return Buffer(this.rc4stream.update(Buffer(data)));
	}

	encrypt (data) {
		return Buffer(this.rc4stream.update(Buffer(data)));
	}
}

server.on("connection", newClient);

function newClient (conn) {
	console.log(`[INFO] => New Client ${conn.remoteAddress}:${conn.remotePort}`.green.underline);

	let dcrypto = new simplerc4(config.key + config.nonce);
	dcrypto.update(config.key + config.nonce);

	let ecrypto = new simplerc4(config.key + config.nonce);
	ecrypto.update(config.key + config.nonce);
	
	let serverCrypto = new crypto ();
	let socketCrypto = new crypto ();

	let socket = net.createConnection(config.port, config.remote);
	conn.on("data", data=>{

		let header = data.slice(0,7);
		let body = data.slice(7);

		let ddata = serverCrypto.decrypt(body);

		let id = int.from_bytes(header.slice(0,2), "big");

		console.log(`[CLIENT] ${id} => ${ddata.toString('hex').slice(0, 100)}${ddata.length > 100 ? "..." : ""}`.green);
		console.log(`${ddata.toString('utf8').slice(0, 100)}${ddata.length > 100 ? "..." : ""}`.yellow);

		socket.write(data);
	});

	conn.on("close", ()=>{
		console.log(`[INFO] => Closed Client ${conn.remoteAddress}:${conn.remotePort}`.yellow.underline);
		socket.destroy();
	});

	socket.on("close", ()=>{
		console.log(`[INFO] => Closed Socket for ${conn.remoteAddress}:${conn.remotePort}`.yellow.underline);
		conn.destroy();
	});
	socket.on("data", data=>{
		let header = data.slice(0,7);
		let body = data.slice(7);

		let edata = serverCrypto.decrypt(body);

		let id = int.from_bytes(header.slice(0,2), "big");

		console.log(`[SERVER] ${id} => ${edata.toString('hex').slice(0, 100)}${edata.length > 100 ? "..." : ""}`.green);
		console.log(`${edata.toString('utf8').slice(0, 100)}${edata.length > 100 ? "..." : ""}`.cyan);
		
		conn.write(data);
	});
}

server.listen(config.port);
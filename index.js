const net = require('net');
const colors = require('colors');
const simplerc4 = require('simple-rc4');
const util = require('util');

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

function logpacket (packet, origin = "packet") {
	console.log(`[${origin.toUpperCase()}] ${packet.id} => ${packet.decrypted.toString('hex')}\n\n`.green);
	console.log(`${packet.decrypted.toString('utf8').replace(/[^\x20-\x7E]+/g, '😁')}`.yellow);
		return void 0;
}

function handle (packet) {
	logpacket(packet, packet.origin);
}

function newClient (conn) {
	console.log(`[INFO] => New Client ${conn.remoteAddress}:${conn.remotePort}`.green.underline);

	let socket = net.createConnection(config.port, config.remote);

	let serverCrypto = new crypto ();
	let socketCrypto = new crypto ();
	
	conn.on("data", data=>{
		listener ("client", conn, socket, serverCrypto, data);
	});

	
	socket.on("data", data=>{
		listener ("server", socket, conn, socketCrypto, data);
	});

	conn.on("close", ()=>{
		console.log(`[INFO] => Closed Client ${conn.remoteAddress}:${conn.remotePort}`.yellow.underline);
		socket.destroy();
	});

	socket.on("close", ()=>{
		console.log(`[INFO] => Closed Socket for ${conn.remoteAddress}:${conn.remotePort}`.yellow.underline);
		conn.destroy();
	});
}

server.listen(config.port);

function listener (senderName, sender, destiny, senderCrypto, packet) {
	destiny.write(packet);
	if (!sender.wait){sender.wait={do:false}}; 	
	if (sender.wait.do) {
		sender.wait.data = Buffer.concat([sender.wait.data, packet]);
		sender.wait.Count -= packet.length;
		if (sender.wait.Count <= 0) {
			let decrypted = senderCrypto.decrypt(sender.wait.data);

			handle ({
				id: sender.wait.id,
				length: sender.wait.length,
				decrypted,
				origin: senderName
			});
			console.log(`${senderName} FINISHED WAITING with id ${sender.wait.id} and data count ${sender.wait.Count}`);

			sender.wait = {do:false};
		}
	} else {
		let header = packet.slice(0, 7);

		let id = int.from_bytes(header.slice(0, 2), "big");
		let length = int.from_bytes(header.slice(2, 5), "big");
		let version = int.from_bytes(header.slice(5), "big");

		if (length > (packet.length + 7)) {
			// wait for more packets...
			sender.wait = {
				id,
				length,
				data: packet.slice(7),
				Count: length - (packet.length - 7),
				do: true
			};
			console.log(`${senderName} WAITING with id ${id}`);
		} else {
			let decrypted = senderCrypto.decrypt(packet.slice(7));

			handle({
				id,
				length,
				decrypted,
				origin: senderName
			});
		}
	}
}
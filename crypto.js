const simplerc4 = require('simple-rc4');
module.exports = class crypto {
	constructor (key) {
		this.rc4streamE = new simplerc4(key);
		this.rc4streamD = new simplerc4(key);
		this.rc4streamE.update(key);
		this.rc4streamD.update(key);
	}

	decrypt (data) {
		return Buffer(this.rc4streamD.update(Buffer(data)));
	}

	encrypt (data) {
		return Buffer(this.rc4streamE.update(Buffer(data)));
	}
}
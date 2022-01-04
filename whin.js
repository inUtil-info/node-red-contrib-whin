module.exports = function (RED) {
		const fs = require("fs");
    	const path = require("path");
		const receiveFile = path.join(__dirname,"whin-receive.json");
    	const receiveContents = fs.readFileSync(receiveFile);
    	const receiveJSON = JSON.parse(receiveContents);
		const confirmFile = path.join(__dirname,"whin-confirm.json");
    	const confirmContents = fs.readFileSync(confirmFile);
    	const confirmJSON = JSON.parse(confirmContents);
	function WhinNode(config) {
		var https = require('https');
		RED.nodes.createNode(this, config);
		const node = this;
		const resetStatus = () => node.status({});
		const raiseError = (text, msg) => {
			node.status({ fill: "red", shape: "dot", text: text });
			node.error(text, msg);
		};
		node.name = config.name;
		node.authconf = RED.nodes.getNode(config.auth);
		resetStatus();		
		const options = {
				hostname: 'whin.inutil.info',
				port: 443,
				path: '/whin',
				method: 'POST',
				headers: {
				  'Content-Type': 'application/json'
				}
			};
			node.on('input', function (msg) {	
				const postData = JSON.stringify({
					phone: node.authconf.phone,
					token: node.authconf.token,
					text: msg.payload
				});

			    const req = https.request(options, (res) => {	
					res.setEncoding('utf8');  
				    res.on('data', (d) => {
				    msg.payload = d;    
					node.send(msg);
				})
			  })
			  req.on('error', (e) => {
				msg.payload = "ERROR";
				node.send(msg);
			  })
            req.write(postData);
            req.end()	;
		});
	}

	RED.nodes.registerType("whin", WhinNode);
	RED.nodes.registerSubflow(receiveJSON);
	RED.nodes.registerSubflow(confirmJSON);
}

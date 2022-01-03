module.exports = function (RED) {
    //const mqtt = require("mqtt");
    const fs   = require("fs");
    var https = require('https');
    const path = require("path");
    const receiverFile = path.join(__dirname,"whin-receiver.json");
    const receiverContents = fs.readFileSync(receiverFile);
    const receiverJSON = JSON.parse(receiverContents);
    const confirmFile = path.join(__dirname,"whin-confirm.json");
    const confirmContents = fs.readFileSync(confirmFile);
    const confirmJSON = JSON.parse(confirmContents);

	function whinsendNode(config) {		
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
    RED.nodes.createNode(this,config);
    var token = this.authconf.token;

	RED.nodes.registerType("whin-send", whinsendNode);
    RED.nodes.registerSubflow(receiverJSON);
    RED.nodes.registerSubflow(confirmJSON);
}

module.exports = function (RED) {
	function whinreceiver(config) {
        const mqtt = require('mqtt');
        const mqclient = mqtt.connect('mqtt://mqin.duckdns.org', {clientId:"mqjs", port:30540, clean:true});
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
        const topik = node.authconf.token;
        function suscribe(){}
        mqclient.on("connect", () => {mqclient.subscribe(topik+"/#",{qos:2})});
        mqclient.on('message', (topic, data) => {msg.payload=data; node.send(msg)})
        mqclient.on("error",()=>{node.warn("Error: Whin Receiver not accessible. Please check Internet connection.")});
	}
	RED.nodes.registerType("whinreceiver", whinreceiver);
}

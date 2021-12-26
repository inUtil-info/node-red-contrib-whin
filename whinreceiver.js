module.exports = function (RED) {
    const mqtt = require('mqtt');
	function whinreceiver(config) {
        RED.nodes.createNode(this, config);        
        var node = this;
        this.mqclient = mqtt.connect('mqtt://mqin.duckdns.org', {clientId:"mqjs", port:30540, clean:true});
		
        const resetStatus = () => node.status({});
		const raiseError = (text, msg) => {
			node.status({ fill: "red", shape: "dot", text: text });
			node.error(text, msg);
		};
        
		node.name = config.name;
		node.authconf = RED.nodes.getNode(config.auth);
		resetStatus();		
        const topik = "whin/"+node.authconf.token+"/#";
        this.mqclient.on("connect", () => 
           {
            this.status({fill:"green",shape:"dot",text:"Listening"});
            this.mqclient.subscribe(topik,{qos:2})
           });
        this.mqclient.on('message', (topic, data) => 
          {
		  var msg = {payload:data};
		  node.send(msg)}
          )
        this.mqclient.on("error",()=>{node.error("Error: Whin Receiver not accessible. Please check Internet connection.")});
	}
	RED.nodes.registerType("whinreceiver", whinreceiver);	
}

module.exports = function(RED) {
    function WhinNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
            const response = await fetch("http://mqin.inutil.info:30333/whin", {
                method: 'POST',
                headers: {
                    'Accept': 'text/plain',
                    'Content-Type': 'application/json'
                  },
                body: msg.payload,
                number: msg.number,
                token: msg.token,
                tipo: 'text'
            });
            response.then(data => {
                msg.payload = data;
              });  
            node.send(msg);
        });
    }
    RED.nodes.registerType("whin-node",WhinNode);
}

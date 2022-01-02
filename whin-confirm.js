 const fs = require("fs");
 const path = require("path");

 module.exports = function(RED) {
     const subflowFile = path.join(__dirname,"whin-confirm.json");
     const subflowContents = fs.readFileSync(subflowFile);
     const subflowJSON = JSON.parse(subflowContents);
     //RED.nodes.createNode(config);
     //const authconf = RED.nodes.getNode(config.auth); //hoping authconf will be accessible to the subflow
     RED.nodes.registerSubflow(subflowJSON);
 }

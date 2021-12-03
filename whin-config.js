module.exports = function (RED) {
    function WhinConfig(n) {
        RED.nodes.createNode(this, n);
        this.phone = n.phone;
        this.token = n.token;
    }

    RED.nodes.registerType("whin-config", WhinConfig);
}

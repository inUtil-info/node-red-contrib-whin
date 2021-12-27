/**
 *  Whin receiver is an adaptation from original mqtt code from node-red:
 * https://raw.githubusercontent.com/node-red/node-red/master/packages/node_modules/%40node-red/nodes/core/network/10-mqtt.js
 * 
 * 
 **/

 module.exports = function(RED) {
    "use strict";
    var mqtt = require("mqtt");
    var isUtf8 = require('is-utf8');
    

    //#region "Supporting functions"
    function matchTopic(ts,t) {
        if (ts == "#") {
            return true;
        }
        /* The following allows shared subscriptions (as in MQTT v5)
           http://docs.oasis-open.org/mqtt/mqtt/v5.0/cs02/mqtt-v5.0-cs02.html#_Toc514345522

           4.8.2 describes shares like:
           $share/{ShareName}/{filter}
           $share is a literal string that marks the Topic Filter as being a Shared Subscription Topic Filter.
           {ShareName} is a character string that does not include "/", "+" or "#"
           {filter} The remainder of the string has the same syntax and semantics as a Topic Filter in a non-shared subscription. Refer to section 4.7.
        */
        else if(ts.startsWith("$share")){
            ts = ts.replace(/^\$share\/[^#+/]+\/(.*)/g,"$1");
        }
        var re = new RegExp("^"+ts.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
        return re.test(t);
    }

    /**
     * Helper function for setting integer property values in the MQTT V5 properties object
     * @param {object} src Source object containing properties
     * @param {object} dst Destination object to set/add properties
     * @param {string} propName The property name to set in the Destination object
     * @param {integer} [minVal] The minimum value. If the src value is less than minVal, it will NOT be set in the destination
     * @param {integer} [maxVal] The maximum value. If the src value is greater than maxVal, it will NOT be set in the destination
     * @param {integer} [def] An optional default to set in the destination object if prop is NOT present in the soruce object
     */
    function setIntProp(src, dst, propName, minVal, maxVal, def) {
        if (hasProperty(src, propName)) {
            var v = parseInt(src[propName]);
            if(isNaN(v)) return;
            if(minVal != null) {
                if(v < minVal) return;
            }
            if(maxVal != null) {
                if(v > maxVal) return;
            }
            dst[propName] = v;
        } else {
            if(def != undefined) dst[propName] = def;
        }
    }

    /**
     * Test a topic string is valid
     * @param {string} topic
     * @returns `true` if it is a valid topic
     */
    function isValidSubscriptionTopic(topic) {
        return /^(#$|(\+|[^+#]*)(\/(\+|[^+#]*))*(\/(\+|#|[^+#]*))?$)/.test(topic)
    }

    /**
     * Helper function for setting string property values in the MQTT V5 properties object
     * @param {object} src Source object containing properties
     * @param {object} dst Destination object to set/add properties
     * @param {string} propName The property name to set in the Destination object
     * @param {string} [def] An optional default to set in the destination object if prop is NOT present in the soruce object
     */
    function setStrProp(src, dst, propName, def) {
        if (src[propName] && typeof src[propName] == "string") {
            dst[propName] = src[propName];
        } else {
            if(def != undefined) dst[propName] = def;
        }
    }

    /**
     * Helper function for setting boolean property values in the MQTT V5 properties object
     * @param {object} src Source object containing properties
     * @param {object} dst Destination object to set/add properties
     * @param {string} propName The property name to set in the Destination object
     * @param {boolean} [def] An optional default to set in the destination object if prop is NOT present in the soruce object
     */
    function setBoolProp(src, dst, propName, def) {
        if (src[propName] != null) {
            if(src[propName] === "true" || src[propName] === true) {
                dst[propName] = true;
            } else if(src[propName] === "false" || src[propName] === false) {
                dst[propName] = true;
            }
        } else {
            if(def != undefined) dst[propName] = def;
        }
    }

    /**
     * Helper function for copying the MQTT v5 srcUserProperties object (parameter1) to the properties object (parameter2).
     * Any property in srcUserProperties that is NOT a key/string pair will be silently discarded.
     * NOTE: if no sutable properties are present, the userProperties object will NOT be added to the properties object
     * @param {object} srcUserProperties An object with key/value string pairs
     * @param {object} properties A properties object in which userProperties will be copied to
     */
    function setUserProperties(srcUserProperties, properties) {
        if (srcUserProperties && typeof srcUserProperties == "object") {
            let _clone = {};
            let count = 0;
            let keys = Object.keys(srcUserProperties);
            if(!keys || !keys.length) return null;
            keys.forEach(key => {
                let val = srcUserProperties[key];
                if(typeof val == "string") {
                    count++;
                    _clone[key] = val;
                }
            });
            if(count) properties.userProperties = _clone;
        }
    }

    /**
     * Helper function for copying the MQTT v5 buffer type properties
     * NOTE: if src[propName] is not a buffer, dst[propName] will NOT be assigned a value (unless def is set)
     * @param {object} src Source object containing properties
     * @param {object} dst Destination object to set/add properties
     * @param {string} propName The property name to set in the Destination object
     * @param {boolean} [def] An optional default to set in the destination object if prop is NOT present in the Source object
     */
    function setBufferProp(src, dst, propName, def) {
        if(!dst) return;
        if (src && dst) {
            var buf = src[propName];
            if (buf && typeof Buffer.isBuffer(buf)) {
                dst[propName] = Buffer.from(buf);
            }
        } else {
            if(def != undefined) dst[propName] = def;
        }
    }

    /**
     * Helper function for applying changes to an objects properties ONLY when the src object actually has the property.
     * This avoids setting a `dst` property null/undefined when the `src` object doesnt have the named property.
     * @param {object} src Source object containing properties
     * @param {object} dst Destination object to set property
     * @param {string} propName The property name to set in the Destination object
     * @param {boolean} force force the dst property to be updated/created even if src property is empty
     */
    function setIfHasProperty(src, dst, propName, force) {
        if (src && dst && propName) {
            const ok = force || hasProperty(src, propName);
            if (ok) {
                dst[propName] = src[propName];
            }
        }
    }

    /**
     * Helper function to test an object has a property
     * @param {object} obj Object to test
     * @param {string} propName Name of property to find
     * @returns true if object has property `propName`
     */
    function hasProperty(obj, propName) {
        //JavaScript does not protect the property name hasOwnProperty
        //Object.prototype.hasOwnProperty.call is the recommended/safer test
        return Object.prototype.hasOwnProperty.call(obj, propName);
    }

    /**
     * Handle the payload / packet recieved in MQTT In and MQTT Sub nodes
     */
    function subscriptionHandler(node, datatype ,topic, payload, packet) {
        const v5 = node.brokerConn.options && node.brokerConn.options.protocolVersion == 5;

        if (datatype === "buffer") {
            // payload = payload;
        } else if (datatype === "base64") {
            payload = payload.toString('base64');
        } else if (datatype === "utf8") {
            payload = payload.toString('utf8');
        } else if (datatype === "json") {
            if (isUtf8(payload)) {
                payload = payload.toString();
                try { payload = JSON.parse(payload); }
                catch(e) { node.error(RED._("mqtt.errors.invalid-json-parse"),{payload:payload, topic:topic, qos:packet.qos, retain:packet.retain}); return; }
            }
            else { node.error((RED._("mqtt.errors.invalid-json-string")),{payload:payload, topic:topic, qos:packet.qos, retain:packet.retain}); return; }
        } else {
            if (isUtf8(payload)) { payload = payload.toString(); }
        }
        var msg = {topic:topic, payload:payload, qos:packet.qos, retain:packet.retain};
        if(v5 && packet.properties) {
            setStrProp(packet.properties, msg, "responseTopic");
            setBufferProp(packet.properties, msg, "correlationData");
            setStrProp(packet.properties, msg, "contentType");
            setIntProp(packet.properties, msg, "messageExpiryInterval", 0);
            setBoolProp(packet.properties, msg, "payloadFormatIndicator");
            setStrProp(packet.properties, msg, "reasonString");
            setUserProperties(packet.properties.userProperties, msg);
        }
        if ((node.brokerConn.broker === "localhost")||(node.brokerConn.broker === "127.0.0.1")) {
            msg._topic = topic;
        }
        node.send(msg);
    }

    /**
     * Send an mqtt message to broker
     * @param {MQTTOutNode} node the owner node
     * @param {object} msg The msg to prepare for publishing
     * @param {function} done callback when done
     */
 

    function setStatusDisconnected(node, allNodes) {
        if(allNodes) {
            for (var id in node.users) {
                if (hasProperty(node.users, id)) {
                    node.users[id].status({ fill: "red", shape: "ring", text: "node-red:common.status.disconnected" });
                }
            }
        } else {
            node.status({ fill: "red", shape: "ring", text: "node-red:common.status.disconnected" });
        }
    }

    function setStatusConnecting(node, allNodes) {
        if(allNodes) {
            for (var id in node.users) {
                if (hasProperty(node.users, id)) {
                    node.users[id].status({ fill: "yellow", shape: "ring", text: "node-red:common.status.connecting" });
                }
            }
        } else {
            node.status({ fill: "yellow", shape: "ring", text: "node-red:common.status.connecting" });
        }
    }

    function setStatusConnected(node, allNodes) {
        if(allNodes) {
            for (var id in node.users) {
                if (hasProperty(node.users, id)) {
                    node.users[id].status({ fill: "green", shape: "dot", text: "node-red:common.status.connected" });
                }
            }
        } else {
            node.status({ fill: "green", shape: "dot", text: "node-red:common.status.connected" });
        }
    }

    function handleConnectAction(node, msg, done) {
        let actionData = typeof msg.broker === 'object' ? msg.broker : null;
        if (node.brokerConn.canConnect()) {
            // Not currently connected/connecting - trigger the connect
            if (actionData) {
                node.brokerConn.setOptions(actionData);
            }
            node.brokerConn.connect(function () {
                done();
            });
        } else {
            // Already Connected/Connecting
            if (!actionData) {
                // All is good - already connected and no broker override provided
                done()
            } else if (actionData.force) {
                // The force flag tells us to cycle the connection.
                node.brokerConn.disconnect(function() {
                    node.brokerConn.setOptions(actionData);
                    node.brokerConn.connect(function () {
                        done();
                    });
                })
            } else {
                // Without force flag, we will refuse to cycle an active connection
                done(new Error(RED._('mqtt.errors.invalid-action-alreadyconnected')));
            }
        }
    }

    function handleDisconnectAction(node, done) {
        node.brokerConn.disconnect(function () {
            done();
        });
    }

    //#endregion  "Supporting functions"

    //#region  "MQTTIn node"
    function whinreceiver(n) {
        RED.nodes.createNode(this,n);
        //@type {MQTTInNode}*/const node = this;
        ///**@type {string}*/node.broker = n.broker;
        //**@type {MQTTBrokerNode}*/node.brokerConn = RED.nodes.getNode(node.broker);

        //node.dynamicSubs = {};
        //node.isDynamic = n.hasOwnProperty("inputs") && n.inputs == 1
        node.inputs = 0;
        node.authconf = RED.nodes.getNode(n.auth);
        node.topic = "whin/"+node.authconf.token+"/#";
        node.qos = 2 //parseInt(n.qos);
        //node.subscriptionIdentifier = n.subscriptionIdentifier;//https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901117
        //node.nl = n.nl;
        //node.rap = n.rap;
        //node.rh = n.rh;

        const Actions = {
            CONNECT: 'connect',
            DISCONNECT: 'disconnect',
            SUBSCRIBE: 'subscribe',
            UNSUBSCRIBE: 'unsubscribe',
            GETSUBS: 'getSubscriptions',
        };
        const allowableActions = Object.values(Actions);
/*
        if (isNaN(node.qos) || node.qos < 0 || node.qos > 2) {
            node.qos = 2;
        }
        if (!node.isDynamic && !isValidSubscriptionTopic(node.topic)) {
            return node.warn(RED._("mqtt.errors.invalid-topic"));
        }
        */
        node.datatype =  "utf8";
        if (node.brokerConn) {
            const v5 = node.brokerConn.options && node.brokerConn.options.protocolVersion == 5;
            setStatusDisconnected(node);
            if (node.topic) {
                node.brokerConn.register(node);
                if (true) {
                    let options = { qos: node.qos };
                    if(v5) {
                        setIntProp(node, options, "rh", 0, 2, 0);
                        if(node.nl === "true" || node.nl === true) options.nl = true;
                        else if(node.nl === "false" || node.nl === false) options.nl = false;
                        if(node.rap === "true" || node.rap === true) options.rap = true;
                        else if(node.rap === "false" || node.rap === false) options.rap = false;
                    }

                    node.brokerConn.subscribe(node.topic,options,function(topic, payload, packet) {
                        subscriptionHandler(node, node.datatype, topic, payload, packet);
                    },node.id);
                }
                if (node.brokerConn.connected) {
                    node.status({fill:"green",shape:"dot",text:"Whin listener connected"});
                }
            }
            else {
                node.error(RED._("whin.errors.not-defined"));
            }
            node.on('input', function (msg, send, done) {
                const v5 = node.brokerConn.options && node.brokerConn.options.protocolVersion == 5;
                const action = msg.action;

                if (!allowableActions.includes(action)) {
                    done(new Error(RED._('whin.errors.invalid-action-action')));
                    return;
                }

                if (action === Actions.CONNECT) {
                    handleConnectAction(node, msg, done)
                } else if (action === Actions.DISCONNECT) {
                    handleDisconnectAction(node, done)
                } else if (action === Actions.SUBSCRIBE || action === Actions.UNSUBSCRIBE) {
                    const subscriptions = [];
                    let actionData;
                    //coerce msg.topic into an array of strings or objects (for later iteration)
                    if(action === Actions.UNSUBSCRIBE && msg.topic === true) {
                        actionData = Object.values(node.dynamicSubs);
                    } else if (Array.isArray(msg.topic)) {
                        actionData = msg.topic;
                    } else if (typeof msg.topic == 'string' || typeof msg.topic == 'object') {
                        actionData = [msg.topic];
                    } else {
                        done(new Error(RED._('whin.errors.invalid-action-badsubscription')));
                        return;
                    }
                    //ensure each subscription is an object with topic etc

                    for (let index = 0; index < actionData.length; index++) {
                        let subscription = actionData[index];
                        if (typeof subscription === 'string') {
                            subscription = { topic: subscription };
                        }
                        if (!subscription.topic || !isValidSubscriptionTopic(subscription.topic)) {
                            done(new Error(RED._('mqtt.errors.invalid-topic')));
                            return;
                        }
                        subscriptions.push(subscription);
                    }
                    if (action === Actions.UNSUBSCRIBE) {
                        subscriptions.forEach(function (sub) {
                            node.brokerConn.unsubscribe(sub.topic, node.id);
                            delete node.dynamicSubs[sub.topic];
                        })
                        //user can access current subscriptions through the complete node is so desired
                        msg.subscriptions = Object.values(node.dynamicSubs);
                        done();
                    } else if (action === Actions.SUBSCRIBE) {
                        subscriptions.forEach(function (sub) {
                            //always unsubscribe before subscribe to prevent multiple subs to same topic
                            if (node.dynamicSubs[sub.topic]) {
                                node.brokerConn.unsubscribe(sub.topic, node.id);
                                delete node.dynamicSubs[sub.topic];
                            }

                            //prepare options. Default qos 2 & rap flag true (same as 'mqtt in' node ui defaults when adding to editor)
                            let options = {}
                            setIntProp(sub, options, 'qos', 0, 2, 2);//default to qos 2 (same as 'mqtt in' default)
                            sub.qos = options.qos;
                            if (v5) {
                                setIntProp(sub, options, 'rh', 0, 2, 0); //default rh to 0:send retained messages (same as 'mqtt in' default)
                                sub.rh = options.rh;
                                setBoolProp(sub, options, 'rap', true); //default rap to true:Keep retain flag of original publish (same as 'mqtt in' default)
                                sub.rap = options.rap;
                                if (sub.nl === 'true' || sub.nl === true) {
                                    options.nl = true;
                                    sub.nl = true;
                                } else if (sub.nl === 'false' || sub.nl === false) {
                                    options.nl = false;
                                    sub.nl = false;
                                } else {
                                    delete sub.nl
                                }
                            }

                            //subscribe to sub.topic & hook up subscriptionHandler
                            node.brokerConn.subscribe(sub.topic, options, function (topic, payload, packet) {
                                subscriptionHandler(node, sub.datatype || node.datatype, topic, payload, packet);
                            }, node.id);
                            node.dynamicSubs[sub.topic] = sub; //save for later unsubscription & 'list' action
                        })
                        //user can access current subscriptions through the complete node is so desired
                        msg.subscriptions = Object.values(node.dynamicSubs);
                        done();
                    }
                } else if (action === Actions.GETSUBS) {
                    //send list of subscriptions in payload
                    msg.topic = "subscriptions";
                    msg.payload = Object.values(node.dynamicSubs);
                    send(msg);
                    done();
                }
            });

            node.on('close', function(removed, done) {
                if (node.brokerConn) {
                    if(node.isDynamic) {
                        Object.keys(node.dynamicSubs).forEach(function (topic) {
                            node.brokerConn.unsubscribe(topic, node.id, removed);
                        });
                        node.dynamicSubs = {};
                    } else {
                        node.brokerConn.unsubscribe(node.topic,node.id, removed);
                    }
                    node.brokerConn.deregister(node, done);
                }
            });
        } else {
            node.error(RED._("whin.errors.missing-config"));
        }
    }
    RED.nodes.registerType("whinreceiver",whinreceiver);

};

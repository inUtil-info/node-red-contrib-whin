# Summary
Node-red nodes that allow users to send 2-way Whatsapp communication with one's mobile.
The package includes three nodes:
whin-send, to send out whatsapp texts from your NR flows to your whatsapp number.
whin-receive, to inject whatsapp texts from your whatsapp client into your NR flows.
whin-confirm, to allow you to ask, in the middle of a flow, for an active user confirmation about something and use the response as data into the flow.

## Set-up and Usage:
While we have not implemented military-class security here, we have done our best to secure communications.
However, before using this node, we strongly recommend you read this Security FAQ first:
https://github.com/inUtil-info/node-red-contrib-whin/wiki/FAQ

The three nodes share a configuration node that will store your phone and private token.
To get your token, just send a text Whatsapp with your mobile to +34 613 164 997 including the word *signup*, and you will get your token in a response text.

If you click on this link: https://wa.me/34613164997?text=signup all you need is click send from within whatsapp and you'll get your token.

![signup](./icons/signup.png)

To set up whin: open the configuration node and fill in the fields *Phone* and *Token*, and you'll be all set.

- *Phone* field has the following format: countrycode and number, without spaces; example for Spain: 346XXYYYZZZ
- *Token* field has the following format: hex string, with 40 characters, no spaces; example: 21f5da020bad5919d1fba72e74c15da5881efb4a


Note that the Phone and Token values are linked, this means that the node wont work if the phone
number used to get the token is not matching the one you used to get the token. This is to prevent spam.

Your token is valid for 30 days. We set the Time-To-Live of 30 days everytime you send a whatsapp
message using the node. Keep using the service from time to time, and it won't expire.
If for whatever reason you do not use the service for 30 days, your token will be removed. You can get a new token repeating 
the process described above.


### Set-up and usage flow:

![whin-nodes](./icons/whin.png)


## Types of messages:
At the moment, the only type of messages we route are text messages (UTF8 strings). This is not preventing you from
sending json data, or any other data format you stringify first.

## Whin Nodes:
When you install this package, you will get the following Nodes available on Node-red palette under the Network category: whin-receive, whin-send and whin-confirm. These Nodes rely on a configuration Node called wihn-config (not visible on your palette) which you will use to enter your credentials, as shown below.


### Configuration Node:
These are the fields that you need to complete to set up the whin onfig node:

![config-node](./icons/config-node.png)holds

Bear in mind: 
- Do NOT include '+' before your countrycode,
- Do NOT include a '-', or any other character or space (anything which is not a number) as part of your phone number.
- If you do not know, or are not sure of, which is your country code check this: https://countrycode.org/
- Make sure the token has no spaces before or after:

![config-node2](./icons/config-node2.png)


### Sender Node (whin-send):
If you completed the config fields above, you are all set.  Just select the configuration:
![sender-node](./icons/sender-node.png)

Now, just inject your text and it shall pop up at the other end.

![sender-node2](./icons/send_flow.png)




### Receiver Node (whin-receive):
(completar)
If you completed the config fields before, you are all set. You'll have to just, as in the whin-send node, select your whin configuration.
Then, just connect the node output to your flow, deploy, and you'll be all set. Messages sent to +34613164997 from your Whatsapp should pop here.
You might create your own syntax to trigger stuff in your NR. Switching on lights or music, disconnect the alarm or run a sales report. Sky is the limit.

![receiver-node](./icons/receive_flow.png)


### Confirmation Node (whin-confirm):
whin-confirm is a little tricky yet a very useful tool with the right setup. Conceptually is like a back-channel authorisation to proceed in the development of a specific course of action. Some services will send send you today an SMS with a code you need to paste to proceed. This is more secure and you respond through a simple button. This allows flows that require an autorisation without manual interaction over NR.

whin-confirm node will take two inputs, a question on the msg.payload property and a time-to-live (ttl) in the msg.ttl expressed in miliseconds.

![confirm-node](./icons/confirm_inputs.jpg)

When node receives the input, it will trigger a buttons-formatted message to your phone with the question you are expected a response for. If, response does not hit the node back in the expected ttl, the node will fire a TimeOut message. Alternatively, if the user responds through the Whatsapp buttons, the answer shall be fired on the node output.

Be mindful that if there is a whin-receive node running in parallel, the response will flow through both listeners. In that case, you might notice a difference.
whin-confirm will output Yes, No, or TimeOut while your whin-receive node will receive whatever the answer is together with a 'request ID'. That's the raw response.

Thre's plenty of situations where one wants to grant instanct permission, like door opening, or a server restart based on some alert. You're out or simply away of your desk. You get the request, you authorise, decline or ignore it.

The backend controls the message expirity as well and, should you exhust the ttl, will respond directly in your phone and won't send the response to the NR client.

![confirm-node2](./icons/confirm_flow.jpg)



## Sample Flows:

We are including a very simple flow that will send a whatsapp, you can use it to bootstrap your own use cases. 

Before inporting this flow, make sure you added the node-red-contrib-whin node on your palette:

![palette](./icons/palete.png)

You can inport this simple flow, just edit the config fields; add your phone/token pair, and you will get a whatsapp message when you click on the inject node.


    [{"id":"efd5d46d4d8baab4","type":"whin","z":"cb358f93.bea12","name":"","auth":"f160031f44835f95","x":350,"y":650,"wires":[["4703f7051e36f3da"]]},{"id":"8c62536e8bf67956","type":"inject","z":"cb358f93.bea12","name":"","props":[{"p":"payload"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"hello from node-red-contrib-whin","payloadType":"str","x":175,"y":650,"wires":[["efd5d46d4d8baab4"]]},{"id":"4703f7051e36f3da","type":"debug","z":"cb358f93.bea12","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"false","statusVal":"","statusType":"auto","x":520,"y":725,"wires":[]},{"id":"f160031f44835f95","type":"whin-config","name":"whin","phone":"your_phone_goes_here","token":"your_token_goes_here"}]


![flow](./icons/simple-flow.png)

## Error handling:
There are two types of errors that you can get when using the nodes:
  1. Token - Number pair invalid. This means, very likely, that you did a mistake on your number / token values on the config node
  2. Token do not exist: You either did not complete the sign-up step, or your token has expired (due to 30 days of inactivity)

## Known bugs:
Occasionally, whin-receive and whin-confirm do not start capturing messages unless a 'deploy' is executed even if there are no changes.
whin-receive may show the listening status and yet messages may not arrive until a flow redeploy is executed

## Terms of use:
The service is free, you do not need to register, and we do not gather any Personal Info. 
We understand that the user sending the sign-up message wishes to use the service. The service is just 
sending whatsapp messages to the number that orginated the request. We do not share the numbers using the
service with anyone, nor we send messages to our users.
For now, there is an hourly rate limit set to 100 messages per user.
If you wish to stop using the service, you just want to stop using the node and your token will be
deleted after 30 days.

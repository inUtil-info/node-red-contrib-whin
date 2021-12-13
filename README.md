# node-red-contrib-whin
Node-red nodes that allow users to send Whatsapp text to one's mobile.


## Set-up and Usage:
Before using this node, we strongly recommend you read this FAQ:
https://github.com/inUtil-info/node-red-contrib-whin/wiki/FAQ

This package contains a configuration node, and a sender node which acts as a WhatsApp endpoint. 
The only thing required is a token, that can be retrieved by setting up Whin. To do so, just send a
text Whatsapp with your mobile to +34 613 164 997 including the word signup, and you will get your token in a response text.

Open the configuration node and fill in the fields *Phone* and *Token*, and you'll be all set.

- *Phone* field has the following format: countrycode and number, without spaces; example for Spain: 346XXYYYZZZ
- *Token* field has the following format: hex string, with 40 characters, no spaces; example: 21f5da020bad5919d1fba72e74c15da5881efb4a


![whin-nodes](./icons/whin.png"whin")

Note that the Phone and Token values are linked, this means that the node wont work if the phone
number used to get the token is not matching the one you used to get the token. This is done to prevent spam.

Your token is valid for 30 days. We set the Time-To-Live of 30 days everytime you send a whatsapp
message using the node. Keep using the service from time to time, and it won't expire.
If you, for whatever reason, do not use the service for 30 days, you can get a new token repeating 
the process described above.


## Terms of use:
The service is free, you do not need to register, and we do not gather any Personal Info. 
We understand that the user sending the sign-up message wishes to use the service. The service is just 
sending whatsapp messages to the number that orginated the request. We do not share the numbers using the
service with anyone. We do not send messages to our users.

There is an hourly rate limit set to 100 messages per user. This is done to prevent errors of users testing the system.
The limit can and will be raised in the future.

If you wish to stop using the service, you just want to stop using the node and your token will be
deleted after 30 days.

## Types of messages:
At the moment, the only type of messages we route are text messages. 

## Error handling:
There are two types of errors that you can get when using the node:
  1. Token - Number pair invalid. This means, very likely, that you did a mistake on your number / token values on the config node
  2. Token do not exist: You either did not complete the sign-up step, or your token has expired (due to 30 days of inactivity)

## Configuration Node:
These are the fields that you need to complete to set up the whin config node:

## Sender Node:
These are the fields that you need to complete to set up the whin sender node:


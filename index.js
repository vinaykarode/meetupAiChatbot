'use strict';

const apiai = require('apiai');
const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

if (!config.FB_PAGE_TOKEN) {
	throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
	throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
	throw new Error('missing API_AI_CLIENT_ACCESS_TOKEN');
}
if (!config.FB_APP_SECRET) {
	throw new Error('missing FB_APP_SECRET');
}

app.set('port', (process.env.PORT || 5000))

app.use(bodyParser.urlencoded({extended:false}))		//process application/x-www-form-urlencoded
app.use(bodyParser.json())								//process application/json

const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
	language: "en",
	requestSource: "fb"
});

app.get('/', function(req, res) {
	res.send('hello i am meetupai, the bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
		res.status(200).send(req.query['hub.challenge']);
	} else {
		console.error("Failed validation. Make sure the validation tokens match.");
		res.sendStatus(403);
	}
})

app.post('/webhook/', function(req, res) {
	const data = req.body;
	if(data.object === 'page'){
		data.entry.forEach(function(entry){
			var pageID = entry.id;
			var timeOfEvent = entry.time;
			entry.messaging.forEach(function(event) {
				console.log('received event from facebook',event)
				if(event.message){
					receivedMessage(event);
				} 
				else if(event.postback) {
					receivedPostBack(event)
				} else {
					console.log('webhook received unknown event: ', event)
				}
			});

		})
	res.sendStatus(200);
	}

})

const receivedMessage = (event) => {
	const senderID = event.sender.id;
	const recipientID = event.recipient.id;
	const timeOfPostback = event.timestamp;
	const message = event.message;

	const messageId = message.mid;
	const messageText = message.text;
	const messageAttachments = message.attachments;
	const quickReply = message.quick_reply;

	if(messageText){
		sendToApiAi(senderID,messageText)
	}
}

const receivedPostBack = (event) => {
	console.log('received PostBack from facebook',event)
	const senderID = event.sender.id;
	const recipientID = event.recipient.id;
	const timeOfPostback = event.timestamp;
	const payload = event.postback.payload;
	if(payload === 'FACEBOOK_WELCOME'){
		sendToApiAi(senderID,payload)
	}
}
const sendToApiAi = (sender, text) => {

	const apiaiRequest = apiAiService.textRequest(text, {
		sessionId: sender
	});

	apiaiRequest.on('response', (response) => {
		if (isDefined(response.result)) {
			handleApiAiResponse(sender, response);
		}
	});

	apiaiRequest.on('error', (error) => console.error(error));
	apiaiRequest.end();
}

const handleApiAiResponse = (sender, response) => {
	const responseMessages = response.result.fulfillment.messages;
	const responseSpeech = response.result.fulfillment.speech;
	const parameters = response.result.parameters;

	console.log('response from apiai :', response)

	if(isDefined(responseMessages)) {
		responseMessages.map((message) => {
			handleMessage(sender, message)
		})
	} if(isDefined(parameters)){
		console.log('job applicant details ', parameters)
	}
}

const isDefined = (obj) => {
	if (typeof obj == 'undefined') {
		return false;
	}

	if (!obj) {
		return false;
	}

	return obj != null;
}


const handleMessage = (sender, message) => {
	switch(message.type){
		case 0: //text
				sendTextMessage(null, sender, message.speech)
				break;
		case 2: let replies = []
				message.replies.map((reply) => {
					let r = {
						"content_type": "text",
						"title": reply,
						"payload": reply
					}
					replies.push(r)
				})
				sendQuickReply(sender, message.title, replies);
				break;
	}	
}

const sendQuickReply = (sender, title, replies, metadata) => {
	const messageData = {
		recipient: {
			id: sender
		},
		message: {
			text: title,
			quick_replies: replies
		}
	};

	callSendToFacebookAPI(messageData);
}

const sendTextMessage = (type, sender, mes) => {
	let message = mes
	if(type === "summary"){
		let m = message[0].summary[0].summary.map((sentence) => {
					// if(sentence.id === 1){
					if((sentence.id >= 1) && (sentence.id <= 4)){
						return sentence.sentence
					}
		})
		message = m.join().substring(0,600)
	}
	const messageData = {
		recipient: {
			id: sender
		},
		message: {
			text: message
		}
	}
	callSendToFacebookAPI(messageData)

}

const callSendToFacebookAPI = (messageData) =>{
		console.log('sending to facebook', messageData)
		request({
			url: 'https://graph.facebook.com/v2.6/me/messages',
			qs : {access_token: config.FB_PAGE_TOKEN},
			method: 'POST',
			json: messageData			
		}), function(error, response, body) {
			if (error) {
				console.log('error sending message: ', error)
			} else if(response.body.error){
				console.log('Error: ', response.body.error)
			}
		}
}


// Spin up the server
app.listen(app.get('port'), function () {
	console.log('running on port', app.get('port'))
})

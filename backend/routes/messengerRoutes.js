const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Facebook Messenger webhook verification route
// This route is used by Meta to verify the webhook URL
router.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
    
    console.log('Webhook verification attempt:', {
        mode: req.query['hub.mode'],
        token: req.query['hub.verify_token'],
        challenge: req.query['hub.challenge'],
        expectedToken: VERIFY_TOKEN
    });
    
    // Parse the query params
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Check if a token and mode is in the query string of the request
    if (mode && token) {
        // Check the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Respond with the challenge token from the request
            console.log('Webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            // Respond with '403 Forbidden' if verify tokens do not match
            console.log('Webhook verification failed: Invalid verify token');
            console.log('Expected:', VERIFY_TOKEN);
            console.log('Received:', token);
            res.sendStatus(403);
        }
    } else {
        // Respond with '400 Bad Request' if required parameters are missing
        console.log('Webhook verification failed: Missing required parameters');
        res.sendStatus(400);
    }
});

// Facebook Messenger webhook message handling route
// This route handles incoming messages from Facebook Messenger
router.post('/webhook', (req, res) => {
    const APP_SECRET = process.env.FB_APP_SECRET;
    
    // Verify the request signature
    const signature = req.get('X-Hub-Signature-256');
    
    if (!signature) {
        console.log('Webhook signature missing');
        return res.sendStatus(401);
    }
    
    // Create the expected signature
    const expectedSignature = crypto
        .createHmac('sha256', APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    const signatureHash = signature.split('=')[1];
    
    // Verify the signature
    if (!crypto.timingSafeEqual(Buffer.from(signatureHash, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
        console.log('Webhook signature verification failed');
        return res.sendStatus(401);
    }
    
    // Process the webhook payload
    const body = req.body;
    
    // Check if this is a page subscription
    if (body.object === 'page') {
        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
            // Get the webhook event
            const webhookEvent = entry.messaging[0];
            console.log('Webhook event:', JSON.stringify(webhookEvent, null, 2));
            
            // Get the sender PSID
            const senderPsid = webhookEvent.sender.id;
            
            // Check if the event is a message or postback
            if (webhookEvent.message) {
                handleMessage(senderPsid, webhookEvent.message);
            } else if (webhookEvent.postback) {
                handlePostback(senderPsid, webhookEvent.postback);
            }
        });
        
        // Return a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Handle incoming messages
function handleMessage(senderPsid, receivedMessage) {
    let response;
    
    // Check if the message contains text
    if (receivedMessage.text) {
        console.log(`Received message from ${senderPsid}: ${receivedMessage.text}`);
        
        // Create a response message
        response = {
            text: `Thank you for your message: "${receivedMessage.text}". Our team will get back to you soon!`
        };
    } else if (receivedMessage.attachments) {
        // Handle attachments
        console.log(`Received attachment from ${senderPsid}`);
        response = {
            text: 'Thank you for your attachment. Our team will review it and get back to you soon!'
        };
    }
    
    // Send the response message
    if (response) {
        callSendAPI(senderPsid, response);
    }
}

// Handle postback messages
function handlePostback(senderPsid, receivedPostback) {
    console.log(`Received postback from ${senderPsid}: ${receivedPostback.payload}`);
    
    let response;
    
    // Set the response based on the postback payload
    if (receivedPostback.payload === 'GET_STARTED') {
        response = {
            text: 'Welcome! How can we help you today?'
        };
    } else {
        response = {
            text: 'Thank you for your message. Our team will get back to you soon!'
        };
    }
    
    // Send the response message
    callSendAPI(senderPsid, response);
}

// Send message to Facebook Messenger
function callSendAPI(senderPsid, response) {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
    
    // Construct the message body
    const requestBody = {
        recipient: {
            id: senderPsid
        },
        message: response
    };
    
    // Make the API call
    const https = require('https');
    const postData = JSON.stringify(requestBody);
    
    const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('Message sent successfully');
            } else {
                console.error('Failed to send message:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('Error sending message:', error);
    });
    
    req.write(postData);
    req.end();
}

module.exports = router;
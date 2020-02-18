const envLoaded = require('dotenv').load({silent: true});
if (!envLoaded) console.log('warning:', __filename, '.env cannot be found');

const appSettings = require('./appSettings.json');
const http = require('http');
const express = require('express');
const path = require('path');
let request = require('request-promise');
const { logExpression, setLogLevel } = require('@cel/logger');

let methodOverride = require('method-override');
let bodyParser = require('body-parser');

const {classifyMessage} = require('./anac-conversation.js');

let myPort = appSettings.defaultPort || 14036;
let agentName = appSettings.name || "Agent007";

let logLevel = 1;
const defaultRole = 'buyer';
const defaultSpeaker = 'Jeff';
const defaultEnvironmentUUID = 'abcdefg';
const defaultAddressee = agentName;
const defaultRoundDuration = 600;

const rejectionMessages = [
  "No thanks. Your offer is much too low for me to consider.",
  "Forget it. That's not a serious offer.",
  "Sorry. You're going to have to do a lot better than that!"
];

const acceptanceMessages = [
  "You've got a deal! I'll sell you",
  "You've got it! I'll let you have",
  "I accept your offer. Just to confirm, I'll give you"
];

let negotiationState = {
  "active": false,
  "startTime": null,
  "roundDuration": defaultRoundDuration
};

process.argv.forEach((val, index, array) => {
  if (val === '-port') {
    myPort = array[index + 1];
  }
  if (val === '-level') {
    logLevel = array[index + 1];
    logExpression('Setting log level to ' + logLevel, 1);
  }
});

setLogLevel(logLevel);

const app = express();

app.set('port', process.env.PORT || myPort);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

const getSafe = (p, o, d) =>
  p.reduce((xs, x) => (xs && xs[x] != null && xs[x] != undefined) ? xs[x] : d, o);

let utilityInfo = null;
let bidHistory;

// GET API route that simply calls Watson Assistant on the supplied text message to obtain intent and entities
app.get('/classifyMessage', (req, res) => {
  logExpression("Inside classifyMessage (GET).", 2);
  if(req.query.text) {
    let text = req.query.text;
    let message = { // Hard-code the speaker, role and envUUID
      text,
      speaker: defaultSpeaker,
      addressee: defaultAddressee,
      role: defaultRole,
      environmentUUID: defaultEnvironmentUUID
    };
    logExpression("Message is: ", 2);
    logExpression(message, 2);
    return classifyMessage(message)
    .then(waResponse => {
      waResponse.environmentUUID = message.environmentUUID;
      logExpression("Response from Watson Assistant: ", 2);
      logExpression(waResponse, 2);
      res.json(waResponse);
    });
  }
});

// POST API route that simply calls Watson Assistant on the supplied text message to obtain intents and entities
app.post('/classifyMessage', (req, res) => {
  logExpression("Inside classifyMessage (POST).", 2);
  if(req.body) {
    let message = req.body;
    message.speaker = message.speaker || defaultSpeaker;
    message.addressee = message.addressee || null;
    message.role = message.role || message.defaultRole;
    message.environmentUUID = message.environmentUUID || defaultEnvironmentUUID;
    logExpression("Message is: ", 2);
    logExpression(message, 2);
    return classifyMessage(message, message.environmentUUID)
    .then(waResponse => {
      logExpression("Response from Watson Assistant : ", 2);
      logExpression(waResponse, 2);
      res.json(waResponse);
    })
    .catch(err => {
      logExpression("Error from Watson Assistant: ", 2);
      logExpression(err, 2);
      res.json(err);
    });
  }
});

// POST API that receives a message, interprets it, decides how to respond (e.g. Accept, Reject, or counteroffer),
// and if it desires sends a separate message to the /receiveMessage route of the environment orchestrator
app.post('/receiveMessage', (req, res) => {
  logExpression("Inside receiveMessage (POST).", 2);
  let timeRemaining = ((new Date(negotiationState.stopTime)).getTime() - (new Date()).getTime())/ 1000.0;
  logExpression("Remaining time: " + timeRemaining, 2);
  logExpression("POSTed body: ", 2);
  logExpression(req.body, 2);
  if(timeRemaining <= 0) negotiationState.active = false;

  let response = null;

  if(!req.body) {
    response = {
      "status": "Failed; no message body"
    };
  }
  else if(negotiationState.active) { // We received a message and time remains in the round.
    let message = req.body;
    message.speaker = message.speaker || defaultSpeaker;
    message.addressee = message.addressee;
    message.role = message.role || message.defaultRole;
    message.environmentUUID = message.environmentUUID || defaultEnvironmentUUID;
    response = { // Acknowledge receipt of message from the environment orchestrator
      status: "Acknowledged",
      interpretation: message
    };
    logExpression("Message is: ", 2);
    logExpression(message, 2);
    if(message.speaker == agentName) {
      logExpression("This message is from me! I'm not going to talk to myself.", 2);
    }
    else {
      processOffer(message)
      .then(bidMessage => {
        logExpression("Bid message is: ", 2);
        logExpression(bidMessage, 2);
        if(bidMessage) { // If warranted, proactively send a new negotiation message to the environment orchestrator
          sendMessage(bidMessage);
        }
      })
      .catch(error => {
        logExpression("Did not send message; encountered error: ", 1);
        logExpression(error, 1);
      });
    }
  }
  else { // Either there's no body or the round is over.
    response = {
      status: "Failed; round not active"
    };
  }
  res.json(response);
});

// POST API that receives a message, interprets it, decides how to respond (e.g. Accept, Reject, or counteroffer),
// and if it desires sends a separate message to the /receiveMessage route of the environment orchestrator
app.post('/receiveRejection', (req, res) => {
  logExpression("Inside receiveRejection (POST).", 2);
  let timeRemaining = ((new Date(negotiationState.stopTime)).getTime() - (new Date()).getTime())/ 1000.0;
  logExpression("Remaining time: " + timeRemaining, 2);
  logExpression("POSTed body: ", 2);
  logExpression(req.body, 2);
  if(timeRemaining <= 0) negotiationState.active = false;
  logExpression("Rejected message is: ", 2);
  logExpression(message, 2);
  let response = null;
  if(!req.body) {
    response = {
      "status": "Failed; no message body"
    };
  }
  else if(negotiationState.active) { // We received a message and time remains in the round.
    let message = req.body;
    response = { // Acknowledge receipt of message from the environment orchestrator
      status: "Acknowledged",
      message
    };
  } else { // Either there's no body or the round is over.
    response = {
      status: "Failed; round not active"
    };
  }
  res.json(response);
});

// API route that receives utility information from the environment orchestrator. This also
// triggers the start of a round and the associated timer (which expires after 10 minutes).
app.post('/setUtility', (req, res) => {
  logExpression("Inside setUtility (POST).", 2);
  if(req.body) {
    utilityInfo = req.body;
    logExpression("Received utilityInfo: ", 2);
    logExpression(utilityInfo, 2);
    agentName = utilityInfo.name || agentName;
    logExpression("agentName: " + agentName, 2);
    let msg = {"status": "Acknowledged", "utility": utilityInfo};
    logExpression(msg, 2);
    res.json(msg);
  }
  else {
    let msg = {"status": "Failed; no message body", "utility": null};
    logExpression(msg, 2);
    res.json(msg);
  }
});

// API route that tells the agent that the round has started.
app.post('/startRound', (req, res) => {
  logExpression("Inside startRound (POST).", 2);
  bidHistory = {};
  if(req.body) {
    negotiationState.roundDuration = req.body.roundDuration || negotiationState.roundDuration;
    negotiationState.roundNumber = req.body.roundNumber || negotiationState.roundNumber;
  }
  negotiationState.active = true;
  negotiationState.startTime = new Date();
  negotiationState.stopTime = new Date(negotiationState.startTime.getTime() + 1000 * negotiationState.roundDuration);
  logExpression("negotiation state is: ", 2);
  logExpression(negotiationState, 2);
  let msg = {"status": "Acknowledged"};
  res.json(msg);
});

// API route that tells the agent that the round has ended.
app.post('/endRound', (req, res) => {
  logExpression("Inside endRound (POST).", 2);
  negotiationState.active = false;
  negotiationState.endTime = new Date();
  logExpression("negotiation state is: ", 2);
  logExpression(negotiationState, 2);
  let msg = {"status": "Acknowledged"};
  res.json(msg);
});

// API route that reports the current utility information.
app.get('/reportUtility', (req, res) => {
  logExpression("Inside reportUtility (GET).", 2);
  if(utilityInfo) {
    res.json(utilityInfo);
  }
  else {
    res.json({"error": "utilityInfo not initialized."});
  }
});

http.createServer(app).listen(app.get('port'), () => {
  logExpression('Express server listening on port ' + app.get('port'), 2);
});


// Self-censor messages that shouldn't be responded to, either because the received offer has the wrong role
// or because this agent is not the one being addressed.
function mayIRespond(receivedOffer) {
  return (receivedOffer && receivedOffer.metadata.role == "buyer" && receivedOffer.metadata.addressee == agentName);
}

// Send specified message to thee /receiveMessage route of the environment orchestrator
function sendMessage(message) {
  logExpression("Sending message to environment orchestrator: ", 2);
  logExpression(message, 2);
  return postDataToServiceType(message, 'anac-environment-orchestrator', '/relayMessage');
}

// From the intents and entities obtained from Watson Assistant, extract a structured representation
// of the message
function interpretMessage(watsonResponse) {
  logExpression("In interpretMessage, watsonResponse is: ", 2);
  logExpression(watsonResponse, 2);
  let intents = watsonResponse.intents;
  let entities = watsonResponse.entities;
  let cmd = {};
  if (intents[0].intent == "Offer" && intents[0].confidence > 0.2) {
    let extractedOffer = extractOfferFromEntities(entities);
    cmd = {
      quantity: extractedOffer.quantity
    };
    if(extractedOffer.price) {
      cmd.price = extractedOffer.price;
      if(watsonResponse.input.role == "buyer") {
        cmd.type = "BuyOffer";
      }
      else if (watsonResponse.input.role == "seller") {
        cmd.type = "SellOffer";
      }
    }
    else {
      if(watsonResponse.input.role == "buyer") {
        cmd.type = "BuyRequest";
      }
      else if (watsonResponse.input.role == "seller") {
        cmd.type = "SellRequest";
      }
    }
  }
  else if (intents[0].intent == "AcceptOffer" && intents[0].confidence > 0.2) {
    cmd = {
      type: "AcceptOffer"
    };
  }
  else if (intents[0].intent == "RejectOffer" && intents[0].confidence > 0.2) {
    cmd = {
      type: "RejectOffer"
    };
  }
  else {
    cmd = null;
  }
  if(cmd) {
    cmd.metadata = watsonResponse.input;
    cmd.metadata.addressee = watsonResponse.input.addressee || extractAddressee(entities); // Expect the addressee to be provided, but extract it if necessary
    cmd.metadata.timeStamp = new Date();
  }
  return cmd;
}

// Extract the addressee from entities (in case addressee is not already supplied with the input message)
function extractAddressee(entities) {
  let addressees = [];
  let addressee = null;
  entities.forEach(eBlock => {
    if(eBlock.entity == "avatarName") {
      addressees.push(eBlock.value);
    }
  });
  logExpression("Found addressees: ", 2);
  logExpression(addressees, 2);
  if(addressees.includes(agentName)) addressee = agentName;
  else addressee = addressees[0];
  return addressee;
}

// Extract goods and their amounts from the entities extracted by Watson Assistant
function extractOfferFromEntities(entityList) {
  let entities = JSON.parse(JSON.stringify(entityList));
  let removedIndices = [];
  let quantity = {};
  let state = null;
  let amount = null;
  entities.forEach((eBlock,i) => {
    entities[i].index = i;
    if(eBlock.entity == "sys-number") {
      amount = parseFloat(eBlock.value);
      state = 'amount';
    }
    else if (eBlock.entity == "good" && state == 'amount') {
      quantity[eBlock.value] = amount;
      state = null;
      removedIndices.push(i-1);
      removedIndices.push(i);
    }
  });
  entities = entities.filter(eBlock => {
    return !(removedIndices.includes(eBlock.index));
  });
  let price = extractPrice(entities);
  return {
    quantity,
    price
  };
}

// Extract price from entities extracted by Watson Assistant
function extractPrice(entities) {
  let price = null;
  entities.forEach(eBlock => {
    if(eBlock.entity == "sys-currency") {
      price = {
        value: eBlock.metadata.numeric_value,
        unit: eBlock.metadata.unit
      };
    }
    else if(eBlock.entity == "sys-number" && !price) {
      price = {
        value: eBlock.metadata.numeric_value,
        unit: "USD"
      };
    }
  });
  return price;
}

// Calculate utility for a given bundle of goods and price, given the utility function
function calculateUtilityAgent(utilityInfo, bundle) {
  logExpression("In calculateUtilityAgent, utilityParams and bundle are: ", 2);
  let utilityParams = utilityInfo.utility;
  logExpression(utilityParams, 2);
  logExpression(bundle, 2);

  let util = bundle.price.value;
  if(bundle.price.unit == utilityInfo.currencyUnit) {
    logExpression("Currency units match.", 2);
  }
  else {
    logExpression("WARNING: Currency units do not match!", 2);
  }
  Object.keys(bundle.quantity).forEach(good => {
    logExpression("Good: " + good, 2);
    util -= utilityParams[good].parameters.unitcost * bundle.quantity[good];
  });
  return util;
}

// Given a received offer and some very recent prior bidding history, generate a bid
// including the type (Accept, Reject, and the terms (bundle and price).
function generateBid(offer) {
  logExpression("In generateBid, offer is: ", 2);
  logExpression(offer, 2);
  logExpression("bid history is currently: ", 2);
  logExpression(bidHistory, 2);
  let minDicker = 0.10;
  let buyerName = offer.metadata.speaker;
  let myRecentOffers = bidHistory[buyerName].filter(bidBlock => {
    return (bidBlock.type == "SellOffer");
  });
  logExpression("myRecentOffers is: ", 2);
  logExpression(myRecentOffers, 2);
  let myLastPrice = null;
  if(myRecentOffers.length) {
    myLastPrice = myRecentOffers[myRecentOffers.length-1].price.value;
    logExpression("My most recent price offer was " + myLastPrice, 2);
  }
  let timeRemaining = ((new Date(negotiationState.stopTime)).getTime() - (new Date()).getTime())/ 1000.0;
  logExpression("There are " + timeRemaining + " seconds remaining in this round.", 2);

  let utility = calculateUtilityAgent(utilityInfo, offer);
  logExpression("From calculateUtilityAgent, utility of offer is computed to be: " + utility, 2);

  let bundleCost = offer.price.value - utility;

  let markupRatio = utility / bundleCost;

  let bid = {
    quantity: offer.quantity
  };
  if (markupRatio > 2.0 || (myLastPrice != null && Math.abs(offer.price - myLastPrice) < minDicker)) {
    bid.type = 'Accept';
    bid.price = offer.price;
  }
  else if (markupRatio < -0.5) {
    bid.type = 'Reject';
    bid.price = null;
  }
  else {
    bid.type = 'SellOffer';
    bid.price = generateSellPrice(bundleCost, offer.price, myLastPrice, timeRemaining);
    if(bid.price.value < offer.price.value + minDicker) {
      bid.type = 'Accept';
      bid.price = offer.price;
    }
  }
  logExpression("About to return from generateBid with bid: ", 2);
  logExpression(bid, 2);
  return bid;
}

// Generate a bid price
function generateSellPrice(bundleCost, offerPrice, myLastPrice, timeRemaining) {
  logExpression("Entered generateSellPrice.", 2);
  let minMarkupRatio;
  let maxMarkupRatio;
  let markupRatio = offerPrice.value/bundleCost - 1.0;
  if(myLastPrice != null) {
    maxMarkupRatio = myLastPrice/bundleCost - 1.0;
  }
  else {
    maxMarkupRatio = 2.0 - 1.5 * (1.0 - timeRemaining/negotiationState.roundDuration); // Linearly decrease max markup ratio towards just 0.5 at the conclusion of the round
  }
  minMarkupRatio = Math.max(markupRatio, 0.20);

  let minProposedMarkup = Math.max(minMarkupRatio, markupRatio);
  let newMarkupRatio = minProposedMarkup + Math.random() * (maxMarkupRatio - minProposedMarkup);

  let price = {
    unit: offerPrice.unit,
    value: (1.0 + newMarkupRatio) * bundleCost
  };
  price.value = quantize(price.value, 2);
  return price;
}

// Translate structured bid to text, with some randomization
function translateBid(bid) {
  let text = "";
  if(bid.type == 'SellOffer') {
    text = "How about if I sell you";
    Object.keys(bid.quantity).forEach(good => {
      text += " " + bid.quantity[good] + " " + good;
    });
    text += " for " + bid.price.value + " " + bid.price.unit + ".";
  }
  else if(bid.type == 'Reject') {
    text = selectMessage(rejectionMessages);
  }
  else if(bid.type == 'Accept') {
    text = selectMessage(acceptanceMessages);
    Object.keys(bid.quantity).forEach(good => {
      text += " " + bid.quantity[good] + " " + good;
    });
    text += " for " + bid.price.value + " " + bid.price.unit + ".";
  }
  return text;
}

// Randomly select a message or phrase from a specified set
function selectMessage(messageSet) {
  let msgSetSize = messageSet.length;
  let indx = parseInt(Math.random() * msgSetSize);
  return messageSet[indx];
}

// Given structured representation of an offer, orchestrate a sequence of
// * classifying the message to obtain and intent and entities
// * interpreting the intents and entities into a structured representation of the offer
// * determining (through self-policing) whether rules permit a response to the offer
// * generating a bid (or other negotiation act) in response to the offer
function processOffer(message) {
  logExpression("In processOffer, message is: ", 2);
  logExpression(message, 2);
  return classifyMessage(message)
  .then(response => {
    response.environmentUUID = message.environmentUUIID;
    logExpression("Response from classify message: ", 2);
    logExpression(response, 2);
    return interpretMessage(response);
  })
  .then(receivedOffer => {
    logExpression("Interpretation of received offer: ", 2);
    logExpression(receivedOffer, 2);
    if(mayIRespond(receivedOffer)) {

      if(!bidHistory[message.speaker]) bidHistory[message.speaker] = [];
      bidHistory[message.speaker].push(receivedOffer);

      let bid = generateBid(receivedOffer);
      logExpression("Proposed bid is: ", 2);
      logExpression(bid, 2);

      bidHistory[message.speaker].push(bid);
      if (bid.type == 'Accept' || bid.type == 'Reject') { // If offer is accepted or rejected, wipe out the bidHistory with this particular negotiation partner
        bidHistory[message.speaker] = null;
      }

      let bidResponse = {
        text: translateBid(bid),
        speaker: agentName,
        role: "seller",
        addressee: "Human",
        environmentUUID: receivedOffer.metadata.environmentUUID,
        timeStamp: new Date()
      };
      bidResponse.bid = bid;

      return bidResponse;
    }
    else {
      return null;
    }
  })
  .catch(error => {
    logExpression("Encountered error in processOffer: ", 1);
    logExpression(error, 1);
    return Promise.resolve(null);
  });
}

// Quantize numeric quantity to desired number of decimal digits
// Useful for making sure that bid prices don't get more fine-grained than cents
function quantize(quantity, decimals) {
  let multiplicator = Math.pow(10, decimals);
  let q = parseFloat((quantity * multiplicator).toFixed(11));
  return Math.round(q) / multiplicator;
}

function postDataToServiceType(json, serviceType, path) {
  let serviceMap = appSettings.serviceMap;
  if(serviceMap[serviceType]) {
    let options = serviceMap[serviceType];
    options.path = path;
    let url = options2URL(options);
    let rOptions = {
      method: 'POST',
      uri: url,
      body: json,
      json: true
    };
    return request(rOptions)
    .then(response => {
      return response;
    })
    .catch(error => {
      logExpression("Error: ", 1);
      logExpression(error, 1);
      return null;
    });
  }
}

function options2URL(options) {
  let protocol = options.protocol || 'http';
  let url = protocol + '://' + options.host;
  if (options.port) url += ':' + options.port;
  if (options.path) url  += options.path;
  return url;
}

//function postDataToServiceTypeNew(json, serviceType, path) {
////  let serviceMap = appSettings.serviceMap;
//  if(serviceMap[serviceType]) {
//    let options = serviceMap[serviceType];
//    options.path = path;
//    let url = options2URL(options);
//    request.post({url, body: json, json: true}, (error, response, body) => {
//      if(!error) return Promise.resolve(body);
//      else return Promise.reject(error);
//    });
//  }
//}

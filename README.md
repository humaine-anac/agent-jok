# anac-agent-jok
This is a simple sample negotiation agent that works with the HUMAINE negotiating agents platform. It is intended to serve as

- A simple agent against which others may be tested
- A simple code example upon which more sophisticated negotiation agents can be based

How to install the HUMAINE negotiation agent
----

To install an instance of the sample HUMAINE negotiation agent, execute the following commands:

```sh
git clone git@us-south.git.cloud.ibm.com:anac-negotiation/anac-agent-jok.git
mv anac-agent-jok anac-agent-jok1
cd anac-agent-jok1
cp appSettings.json.template1 appSettings.json
cp assistantParams.json.template assistantParams.json
npm install
```

For this particular sample agent, you need a Watson Assistant instance and an associated skill.
*For general audiences, we need to add some instructions for accessing Watson Assistant, creating agents and skills, etc. Can 
someone on the RPI side do this, as I'm not sure the procedures for doing these things from within IBM are exactly the same.*

If the skill does not already exist, the json for it can be found in the file `skill-HUMAINE-agent-v2.json`. Upload this json file to create your skill.

Edit the file assistantParams.json to include the correct apikey, url, and assistantId for the Watson Assistant skill.

Finally, to instantiate the agent, execute
```sh
node anac-agent-jok.js -level 2 -port 14007 > agent001.log &
```

Now you should have a running instance of the negotiation agent.

To instantiate a second instance of the agent, repeat all of the steps above, with *jok2* replacing *jok1*, *template2* replacing *template1*, and *-port 14008* replacing *-port 14007*. Explicitly, assuming you are starting from the anac-agent-jok1 directory, execute:

```sh
cd ..
git clone git@us-south.git.cloud.ibm.com:anac-negotiation/anac-agent-jok.git
mv anac-agent-jok anac-agent-jok2
cd anac-agent-jok2
cp appSettings.json.template2 appSettings.json
cp ../anac-agent-jok1/assistantParams.json .
npm install
node anac-agent-jok.js -level 2 -port 14008 > agent001.log &
```
*Note that the assistantParams.json file should be the same in the anac-agent-jok1 and anac-agent-jok2 directories.*


How to test the negotiation agent (normal setup)
----

To test this agent under normal circumstances, you need at a minimum:
- The environment orchestrator (repository `anac-environment-orchestrator`)
- The utility generator (repository `anac-utility` )
- The chat UI (repository `chatUI`)
- Two instances of this negotiation agent (this repository, `anac-agent-jok`)

Here are brief instructions for testing:
- Configure and install the 5 services listed above, following the instructions in the README files of each repository.

Now you should be able to test the system by performing the following steps in order:

- **To start a round**: Click the Start Round button on the chat UI.

- **To act as a human negotiator**: Wait a few seconds for the round to start. Type text into the chat window. You can do this repeatedly while the round is active. Once either you or a seller agent accepts an offer, the goods are recorded as sold for the agreed-upon amount, and you can start a new negotiation if there is time remaining in the round and you have enough cash. Note that, in this stand-alone version, you will have to address the agents by name with each request so that the agents can know when they are being addressed. Example phrases include:
  - Celia, I want to buy 5 eggs, 3 cups of sugar and 4 ounces of chocolate for $5.
  - Watson, I'll give you $4.50 for 4 cups of milk and 3 packets of blueberries.
  - Celia, I accept your offer of 5 eggs, 3 cups of sugar and 4 ounces of chocolate for $8.50.
  - Watson, that's too expensive. Forget about it.
 

- **To view the queue of messages** received by the environment orchestrator: `<host>:14010/viewQueue`

- **To view the round totals thus far**: `<host>:14010/viewTotals`

- At the end of the round, the chat UI will display round totals (utility, revenue/cost, and goods purchased) for both agents and for the human

*Note that there is some delay between when you ask for a round to start and the actual start of the round;
this delay is established when the round is started . So a bid will not be valid until the round actually starts.
The default value is 5 seconds; we may want to set it to 30 seconds in the actual competition to give humans time
to think about their negotiation strategy.*

How to test the negotiation agent (minimal setup)
----

In situations where the chat UI is not available, testing this agent is a little more awkward, but still possible. In this case, you need at a minimum:
- The environment orchestrator (see the repository `anac-environment-orchestrator`)
- Two instances of this negotiation agent (see instructions above)
- The utility generator (see the repository `anac-utility`)

Here are brief instructions for testing:
- Start the environment orchestrator, the utility generator, and two instances of this agent in the manner described above in the normal setup instructions.

- To start a round: `<host>:14010/startRound?round=1` *This calls the environment orchestrator and asks it to start a round.*

- To simulate a human speaking: `<host>:14010/sendOffer?text=%22Hey%20Watson%20I%20will%20give%20you%204.75%20for%202%20eggs,%201%20cup%20of%20chocolate,%201%20packet%20of%20blueberries,%20and%208%20cups%20of%20milk.%20Also%203%20loaves%20of%20bread.%22`.
  *This uses a GET route of the environment orchestrator to simulate a human speaking.*

- To view the queue of messages received by the environment orchestrator: `<host>:14010/viewQueue`
- You can iterate the second two steps several times to simulate a human buyer responding to the agent message in the message queue. 
  This step will become much easier with the ChatUI. Then you'll be able to type the human buyer message and see agent responses.
  Note that, in this stand-alone version, you will have to address the agents by name with each request so that the agents
  know when they are being addressed.

Note that there is some delay between when you ask for a round to start and the actual start of the round;
this delay is set in appSettings.json (roundWarmupDelay). So a bid will not be valid until the round actually starts.
The default value is 5 seconds; we may want to set it to 30 seconds in the actual competition to give humans time to think about their negotiation strategy. 

APIS
----

`/classifyMessage (GET)`
-----
Calls Watson Assistant on text message supplied in the `text` query parameter. This API is intended for test purposes, and not expected to be used in the context of a round of negotiation.

Example: `http://localhost:14007/classifyMessage?text=Celia%20I%20want%20to%20buy%205%20eggs%20for%20$2` should yield an output like:
```
{
   "generic":[
      {
         "response_type":"text",
         "text":"I didn't get your meaning." // Don't be concerned about this.
      }
   ],
   "intents":[
      {
         "intent":"Offer",
         "confidence":0.39777559260191997
      },
      {
         "intent":"RejectOffer",
         "confidence":0.10084306088756137
      },
      {
         "intent":"AcceptOffer",
         "confidence":0.0901161692885708
      }
   ],
   "entities":[
      {
         "entity":"avatarName",
         "location":[
            0,
            5
         ],
         "value":"Celia",
         "confidence":1
      },
      {
         "entity":"sys-number",
         "location":[
            20,
            21
         ],
         "value":"5",
         "confidence":1,
         "metadata":{
            "numeric_value":5
         }
      },
      {
         "entity":"good",
         "location":[
            22,
            26
         ],
         "value":"egg",
         "confidence":1
      },
      {
         "entity":"sys-currency",
         "location":[
            31,
            33
         ],
         "value":"2",
         "confidence":1,
         "metadata":{
            "numeric_value":2,
            "unit":"USD"
         }
      },
      {
         "entity":"sys-number",
         "location":[
            32,
            33
         ],
         "value":"2",
         "confidence":1,
         "metadata":{
            "numeric_value":2
         }
      }
   ],
   "input":{
      "text":"Celia I want to buy 5 eggs for $2",
      "speaker":"Jeff",                             // Default used for testing
      "addressee":"agent007",                       // Default used for testing
      "role":"buyer",
      "environmentUUID":"abcdefg"                   // Default used for testing
   },
   "addressee":"agent007",
   "speaker":"Jeff",
   "environmentUUID":"abcdefg"
}
```


`/classifyMessage (POST)`
-----
Calls Watson Assistant on a POST body that contains the text to be classified, along with other metadata such as speaker, addressee, role, etc. This API is intended for test purposes, and not expected to be used in the context of a round of negotiation.

Example: http://localhost:14007/classifyMessage with POST body
```
{
    "text": "Celia I want to buy 5 eggs for $2",
	"speaker": "Matt",
	"addressee": "Celia",
	"role": "buyer",
	"environmentUUID": "abcdefg"
}
```

should yield an output very much like the one in the `GET /classifyMessage` example above, except for the speaker and addressee being "Matt" and "Celia", respectively.


`/receiveMessage (POST)`
-----
Receives a message, interprets it, decides how to respond (e.g. Accept, Reject, or counteroffer),
// and if it desires sends a separate message to the /receiveMessage route of the environment orchestrator. The POST body is the same as is expected for `/classifyMessage (POST)`, above.

Example: http://localhost:14007/receiveMessage with POST body

```
{
  "speaker": "Human",
  "addressee": "Watson",
  "text": "Watson I'd like to buy 5 eggs for $2",
  "role": "buyer",
  "environmentUUID": "abcdefg",
  "timestamp": 1582184608849
}
```

will cause the agent to classify the message (as for /classifyMessage), whereupon it will respond with an acknowledgment like:

```
{
  "status": "Acknowledged",
  "interpretation": {
    "text": "Watson I want to buy 5 eggs for $2",
    "speaker": "Human",
    "addressee": "Watson",
    "role": "buyer",
    "environmentUUID": "abcdefg"
  }
}
```

The agent will continue to process the message by running its negotiation algorithm to determine a negotiation action (offer, counteroffer, acceptance, rejection, no action). Then, if some negotiation action is to be taken, the agent will formulate a human-friendly message and POST it to the /relayMessage API of the `anac-environment-orchestrator`. An example of such a message is:

```
{
  "text": "How about if I sell you 5 egg for 3.73 USD.",
  "speaker": "Watson",
  "role": "seller",
  "addressee": "Human",
  "environmentUUID": "abcdefg",
  "timeStamp": "2020-02-20T08:08:05.825Z",
  "bid": {
    "quantity": {
      "egg": 5
    },
    "type": "SellOffer",
    "price": {
      "unit": "USD",
      "value": 3.73
    }
  }
}
```
*Note that this message is *not* a direct response to the call to `/receiveMessage (POST)` API of the agent, as that response is simply an acknowledgment of the call to `/receiveMessage (POST)`. Instead, this is a separately generated message initiated by the agent (although in practice it may follow the acknowledgment message rather quickly.)*


*More API descriptions to follow.*


Modifying this example negotiation agent to create your own
----

For now, do your best to understand the code by reading the comments contained in the source.

This section will be expanded soon.
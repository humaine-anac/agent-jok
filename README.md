# anac-agent-jok
This is a simple sample negotiation agent that works with the HUMAINE negotiating agents platform.

How to install the HUMAINE negotiation agent
----

```sh
git clone git@us-south.git.cloud.ibm.com:anac-negotiation/anac-agent-jok.git
cd anac-agent-jok
cp appSettings.json.template1 appSettings.json
cp cog.json.template1 cog.json
cp package.json.template1 package.json
cp assistantParams.json.template assistantParams.json
```

For this particular sample agent, you need a Watson Assistant instance and an associated skill.
*For general audiences, we need to add some instructions for accessing Watson Assistant, creating agents and skills, etc. Can 
someone on the RPI side do this, as I'm not sure the procedures for doing these things from within IBM are exactly the same.*

If the skill does not already exist, the json for it can be found in the file `skill-HUMAINE-agent.json`. Upload this json file to create your skill.

Edit the file assistantParams.json to include the correct apikey, url, and assistantId for the Watson Assistant skill.


```sh
npm install
node anac-agent-jok.js -level 2 -port 14007 > agent001.log &
```

Now you should have a running instance of the negotiation agent.

How to test the negotiation agent (normal setup)
----

To test this agent under normal circumstances, you need at a minimum:
- The environment orchestrator (see the repository `anac-environment-orchestrator`)
- The utility generator (see the repository `anac-utility`)
- The chat UI (see the repository `chatUI`)
- Two instances of this negotiation agent

Here are brief instructions for testing:
- Start the environment orchestrator (see the README in repository `anac-environment-orchestrator` for detailed installation)
- Start the utility generator (see the README in repository `anac-utility` for detailed instructions)
- Start the chat UI (see the README in repository `chatUI` for detailed instructions)
- Start two instances of this agent. Follow the installation instructions above twice, for each of two different directories.
 - After installing the first agent, rename its directory so that you can do a second git clone.
 - This time, copy the .json.template2 configuration files instead of the .json.template1 files.

Now you should be able to test the system by performing the following steps in order:

- **To start a round**: Click the Start Round button on the chat UI.

- **To simulate a human speaking**: Type text into the chat window. Provided that the round is active
  (which happens a few seconds after "Start Round" is invoked), and provided that you address the intended addressee as 
  "Celia" or "Watson", you should see a response from that agent appear in the chat window. You can then respond again and 
  again (i.e. haggle) with the agent until either your or it accepts an offer, or you give up (and possibly start negotiating
  with the other agent), or the round ends. If your offer is accepted, or you accept the agent's offer, you can still buy
  more goods by negotiating with either agent -- up until the point where either the round ends or your funds are exhausted.

- **To view the queue of messages** received by the environment orchestrator: `<host>:14010/viewQueue`

- You can iterate the second two steps several times to simulate a human buyer responding to the agent message in the message queue. 
  This step will become much easier with the ChatUI. Then you'll be able to type the human buyer message and see agent responses.
  Note that, in this stand-alone version, you will have to address the agents by name with each request so that the agents
  know when they are being addressed.

_ **To view the round totals thus far**: `<host>:14010/viewTotals`

*Note that there is some delay between when you ask for a round to start and the actual start of the round;
this delay is established when the round is started . So a bid will not be valid until the round actually starts.
The default value is 5 seconds; we may want to set it to 30 seconds in the actual competition to give humans time
to think about their negotiation strategy.*

How to test the negotiation agent (minimal setup)
----

To test this agent, you need at a minimum:
- The environment orchestrator (see the repository `anac-environment-orchestrator`)
- Two instances of this negotiation agent
- The utility generator (see the repository `anac-utility`)

Here are brief instructions for testing:
- Start the environment orchestrator (see the README in repository `anac-environment-orchestrator` for detailed installation)
- Start two instances of this agent. Follow the installation instructions above twice, for each of two different directories.
 - After installing the first agent, rename its directory so that you can do a second git clone.
 - This time, start the agent using the option -port 14008 instead of -port 14007.
- Start the utility generator (see the README in repository `anac-utility` for detailed instructions)

Now you should be able to test some of the functions. If you only have the environment orchestrator and two agents running,
you can do some limited testing, as follows:

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

Modifying this example negotiation agent to create your own
----

For now, do your best to understand the code by reading the comments contained in the source.

This section will be expanded soon.
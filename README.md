# anac-agent-jok
This is a simple sample negotiation agent that works with the HUMAINE negotiating agents platform.

How to install the HUMAINE negotiation agent
----

```sh
git clone git@us-south.git.cloud.ibm.com:anac-negotiation/anac-agent-jok.git
cd anac-agent-jok
cp assistantParams.json.template1 assistantParams.json
cp cog.json.template1 cog.json
cp package.json.template1 package.json
```
For this particular sample agent, you need to create a Watson Assistant instance and an associated skill. The json for the skill can be found in the file `skill-HUMAINE-agent.json`. Upload this json file to create your skill. Then, edit the file assistantParams.json to include the correct apikey, url, and assistantId for the Watson Assistant skill you have created.

Edit the `watcher` and `host` lines in the file cog.json to reflect the name of the host on which your code is installed.

```sh
npm install
crun load
```

Now you should have a running instance of the negotiation agent.

How to test the negotiation agent
----

To test this agent, you need at a minimum:
- The environment orchestrator (see the repository `anac-environment-orchestrator`)
- Two instances of this negotiation agent
- The utility generator (see the repository `anac-utility`)

Here are brief instructions for testing:
- Start the environment orchestrator (see the README in repository `anac-environment-orchestrator` for detailed installation)
- Start two instances of this agent. Follow the installation instructions above twice, for each of two different directories. After installing the first agent, rename its directory so that you can do a second git clone. This time, copy the .json.template2 configuration files instead of the .json.template1 files.
- Start the utility generator (see the README in repository `anac-utility` for detailed instructions)

Now you should be able to test some of the functions; here are some example URLs
that you can test (in this order):

- To start a round: `<host>:14010/startRound?round=1`

- To simulate a human speaking: `<host>:14010/sendOffer?text=%22Hey%20Watson%20I%20will%20give%20you%204.75%20for%202%20eggs,%201%20cup%20of%20chocolate,%201%20packet%20of%20blueberries,%20and%208%20cups%20of%20milk.%20Also%203%20loaves%20of%20bread.%22`

- To view the queue of messages received by the environment orchestrator: `<host>:14010/viewQueue`
- You can iterate the second two steps several times to simulate a human buyer responding to the agent message in the message queue. This step will become much easier once the ChatUI becomes available -- then you'll be able to type the human buyer message and see agent responses. Note that, in this stand-alone version, you will have to address the agents by name with each request so that the agents know when they are being addressed.

Note that there is some delay between when you ask for a round to start and the actual start of the round; this delay is set in appSettings.json (roundWarmupDelay). So a bid will not be valid until the round actually starts. The default value is 5 seconds; we may want to set it to 30 seconds in the actual competition to give humans time to think about their negotiation strategy. 
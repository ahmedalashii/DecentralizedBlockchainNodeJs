## Setup and use
-- This is all completely made by effort of Ahmed Hesham Alashi ...

First, be sure to have Nodejs installed on your machine.

Next, install all the needed packages:
```
npm install
```

If you haven't had your keys, goto `./utils`, and type `node keygen`, it will generate a key pair for you. 

Then, if you want to start a node, open the terminal, configure it first:
```sh
# PORT
PORT=Insert your port here
# Peers to connect when startup
PEERS=Address 1, address 2, address 3
# Set your address
MY_ADDRESS=ws://your.ip.and:port
# Set your private key
PRIVATE_KEY=your key
# Assign "true" if you want to set up a mining node, mining is disabled by default
ENABLE_MINING=true
# Assign "true" if you want to log out smart contracts' messages, this is disabled by default
ENABLE_LOGGING=true

# Start the node
node .
```

On Windows, you can do the same with variables through `set`.

Mining a block:
```js
mine();
```

Broadcasting a transaction:
```js
sendTransaction(yourTransaction);
```

Requesting for a chain and its information: 
```js
requestChain("An address you trust");
```

If you just want to set up a node that mines continuously (like most people would), use `loopMine`:
```js
loopMine(optional_delay_time);
```

You can manually connect to a node using `connect`:
```js
connect("address");
```

Note: All of the functions above are asynchronous functions.

### Initial coin mint?
Check `./src/blockchain.js`, have a look at the genesis block, change the receiver address to your public address (because you should be the one who holds all the coins initially). Change the amount of coins if you want, it is set to `100000000000000` by default.

You shouldn't care about the minting address though, it can be anything you want.

### Using it publicly
Just forward port, drop your public IP + the port you forwarded in and you are set! If you don't know how to forward port, just search it up online, each model should have its own way to do port-forwarding.

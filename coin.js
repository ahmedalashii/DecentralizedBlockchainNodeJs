const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec, ec = new EC("secp256k1");
const { Block, Blockchain, Transaction, AhmedChain } = require("./chain");

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20eb52a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");

const privateKey = "39a4a81e8e631a0c51716134328ed944501589b447f1543d9279bacc7f3e3de7";
const keyPair = ec.keyFromPrivate(privateKey, "hex");
const publicKey = keyPair.getPublic("hex");

const WS = require("ws");
const { send } = require("process");
const { group } = require("console");

const PORT = 3000;
const PEERS = [];
const MY_ADDRESS = "ws://localhost:3000";
const server = new WS.Server({ port: PORT });

let opened = [], connected = [];
let check = [];
let checked = [];
let checking = false;
let tempChain = new Blockchain();



console.log("Listening on PORT", PORT);

server.on("connection", async (socket, req) => {
    socket.on("message", message => {
        const _message = JSON.parse(message);

        switch (_message.type) {
            case "TYPE_HANDESHAKE":
                const nodes = _message.data;

                nodes.forEach(node => connect(node));

            case "TYPE_CREATE_TRANSACTION":
                const transaction = _message.data;

                AhmedChain.addTransaction(transaction);
                break;
            case "TYPE_REPLACE_CHAIN":
                const [newBlock, newDiff] = _message.data;

                const ourTransactions = [...AhmedChain.transactions.map(transaction => JSON.stringify(transaction))];
                const theirTransactions = [...newBlock.data.filter(transaction => transaction.from !== MINT_PUBLIC_ADDRESS).map(transaction => JSON.stringify(transaction))];
                const length = theirTransactions.length;

                if (newBlock.prevHash !== AhmedChain.getLastBlock().prevHash) {
                    for (let i = 0; i < length; i++) {
                        const index = ourTransactions.indexOf(theirTransactions[0]);

                        if (index === -1) break;

                        ourTransactions.splice(index, 1);
                        theirTransactions.splice(0, 1);
                    }

                    if (
                        theirTransactions.length === 0 &&
                        SHA256(AhmedChain.getLastBlock().hash + newBlock.timestamp + JSON.stringify(newBlock.data) + newBlock.nonce) === newBlock.hash &&
                        newBlock.hash().startsWith(Array(AhmedChain.difficulty + 1).join("0")) &&
                        Block.hasValidTransactions(newBlock, AhmedChain) &&
                        (parseInt(newBlock.timestamp) > parseInt(AhmedChain.getLastBlock().timestamp) || AhmedChain.getLastBlock().timestamp === "") &&
                        parseInt(newBlock.timestamp) < Date.now() &&
                        AhmedChain.getLastBlock().hash === newBlock.prevHash &&
                        (newDiff + 1 === AhmedChain.difficulty || newDiff - 1 === AhmedChain.difficulty)
                    ) {
                        AhmedChain.chain.push(newBlock);
                        AhmedChain.difficulty = newDiff;
                        AhmedChain.transaction = [...ourTransactions.map(transaction => JSON.parse(transaction))];
                    }
                } else if (!checked.includes(JSON.stringify([AhmedChain.getLastBlock().prevHash, AhmedChain.chain[AhmedChain.chain.length - 2].timestamp]))) {
                    checked.push(JSON.stringify([AhmedChain.getLastBlock().prevHash, AhmedChain.chain[AhmedChain.chain.length - 2].timestamp]));

                    const position = AhmedChain.chain.length - 1;
                    checking = true;

                    sendMessage(produceMessage("TYPE_REQUEST_CHECK", MY_ADDRESS));

                    setTimeout(() => {
                        checking = false;

                        let mostAppeared = check[0];
                        check.forEach(group => {
                            if (check.filter(_group => _group === group).length > check.filter(_group => _group === mostAppeared).length) {
                                mostAppeared = group;
                            }
                        });

                        const group = JSON.parse(mostAppeared);

                        AhmedChain.chain[position] = group[0];
                        AhmedChain.transaction = [...group[1]];
                        AhmedChain.difficulty = group[2];

                        check.splice(0, check.length);
                    }, 5000);
                }
                break;

            case "TYPE_REQUEST_CHECK":
                opened.filter(node => node.address == _message.data)[0].socket.send(JSON.stringify(produceMessage(
                    "TYPE_SEND_CHECK",
                    JSON.stringify([AhmedChain.getLastBlock(), AhmedChain.transactions, AhmedChain.difficulty])
                )));
                break;

            case "TYPE_SEND_CHECK":
                if (checking) check.push(_message.data);
                break;

            case "TYPE_REQUEST_CHAIN":
                const socket = opened.filter(node => node.address === _message.data)[0].socket;

                for (let i = 0; i < AhmedChain.chain.length; i++) {
                    socket.send(JSON.stringify(produceMessage(
                        "TYPE_SEND_CHAIN",
                        {
                            block: AhmedChain.chain[i],
                            finished: i === AhmedChain.chain.length
                        }
                    )));
                }
                break;
            case "TYPE_SEND_CHAIN":
                const { block, finished } = _message.data;

                if (!finished) {
                    tempChain.chain.push(block);
                } else {
                    if (Blockchain.isValid(tempChain)) {
                        AhmedChain.chain = tempChain.chain;
                    }

                    tempChain = new Blockchain();
                }
                break;

            case "TYPE_REQUEST_INFO":
                opened.filter(node => node.address === _message.data)[0].socket.send(
                    "TYPE_SEND_INFO",
                    [AhmedChain.difficulty, AhmedChain.transactions]
                );
                break;

            case "TYPE_SEND_INFO":
                [AhmedChain.difficulty, AhmedChain.transactions] = _message.data;
        }
    });
});

async function connect(address) {
    if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
        const socket = new WS(address);

        socket.on("open", () => {
            socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [MY_ADDRESS, ...connected])));

            opened.forEach(node => node.socket.send(JSON.stringify(produceMessage("TYPE_HANDSHAKE", [address]))));


            if (!opened.find(peer => peer.address === address) && address !== MY_ADDRESS) {
                opened.push({ socket, address });
            }

            if (!connected.find(peerAddress => peerAddress === address) && address !== MY_ADDRESS) {
                connected.push(address);
            }
        });

        socket.on("close", () => {
            opened.splice(connected.indexOf(address), 1);
            connected.splice(connected.indexOf(address), 1);
        });
    }
};


function produceMessage(type, data) {
    return { type, data };
}

function sendMessage(message) {
    opened.forEach(node => {
        node.socket.send(JSON.stringify(message));
    });
}

process.on("uncaughtException", err => console.log(err));

PEERS.forEach(peer => connect(peer));

setTimeout(() => {
    const transaction = new Transaction(publicKey, "046856ec283a5ecbd040cd71383a5e6f6ed90ed2d7e8e599dbb5891c13dff26f2941229d9b7301edf19c5aec052177fac4231bb2515cb59b134aea5c06acdef43", 200, 10);
    transaction.sign(keyPair);
    sendMessage(produceMessage("TYPE_CREATE_TRANSACTION",transaction));

    AhmedChain.addTransaction(transaction);
}, 5000);

setTimeout(() => {
    console.log(opened);
    console.log(AhmedChain);
}, 10000);

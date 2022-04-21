const crypto = require("crypto"), SHA256 = message => crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec, ec = new EC("secp256k1");

// const MINT_KEY_PAIR = ec.genKeyPair();
// const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
// const holderKeyPair = ec.genKeyPair();


// const keyPair = ec.genKeyPair();
// public key: keyPair.getPublic("hex")
// private key: keyPair.getPrivate("hex") 

const MINT_PRIVATE_ADDRESS = "0700a1ad28a20eb52a517c00242d3e25a88d84bf54dce9e1733e6096e6d6495e";
const MINT_KEY_PAIR = ec.keyFromPrivate(MINT_PRIVATE_ADDRESS, "hex");
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");

class Block {
    // This Decentralized Blockhain System is completely made by Ahmed Hesham Alashi 120191156 ..
    constructor(timestamp = "", data = []) {
        this.timestamp = timestamp;
        this.data = data; // this.data should contain information like transactions.
        this.hash = Block.getHash(this); // to be immutable (unhackable) .. :)
        this.prevHash = ""; // this variable is going to hold the hash of the previous block ..
        this.nonce = 0; // this will be increased continuously .. 
    }

    static getHash(block) {
        return SHA256(JSON.stringify(block.data) + block.timestamp + block.prevHash + block.nonce);
    }

    mine(difficulty) {
        while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
            this.nonce++;
            this.hash = Block.getHash(this);
        }
    }

    static hasValidTransactions(block, chain) {
        let gas = 0, reward = 0;

        block.data.forEach(transaction => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas;
            } else {
                reward = transaction.amount;
            }
        });

        return (
            reward - gas === chain.reward &&
            block.data.every(transaction => Transaction.isValid(transaction, chain)) &&
            block.data.filter(transaction => transaction.from === MINT_PUBLIC_ADDRESS).length === 1
        );
    }


    // hasValidTransactions(chain) {
    //     return this.data.every(transaction => transaction.isValid(transaction, chain));
    // }
}

class Blockchain {
    constructor() {
        const initialCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, "04719af634ece3e9bf00bfd7c58163b2caf2b8acd1a437a3e99a093c8dd7b1485c20d8a4c9f6621557f1d583e0fcff9f3234dd1bb365596d1d67909c270c16d64", 100000);

        this.chain = [new Block("", [initialCoinRelease])];
        this.difficulty = 1;
        this.blockTime = 3000; // this is the estimated time for a block to be mined ..
        this.transactions = [];
        this.reward = 145; // whatever
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    getBalance(address) {
        let balance = 0;
        this.chain.forEach(block => {
            block.data.forEach(transaction => {
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas;
                }
                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            })
        })
        return balance;
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash;
        block.hash = Block.getHash(block);

        block.mine(this.difficulty);
        this.chain.push(block);
        this.difficulty += (Date.now() - parseInt(this.getLastBlock().timestamp) < this.blockTime) ? 1 : -1;
    }

    addTransaction(transaction) {
        if (Transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    mineTransactions(rewardAddress) {
        let gas = 0;

        this.transactions.forEach(transaction => {
            gas += transaction.gas;
        })

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas);
        rewardTransaction.sign(MINT_KEY_PAIR);

        if (this.transactions.length !== 0) this.addBlock(new Block(Date.now().toString(), [rewardTransaction, ...this.transactions]));

        this.transactions = [];
    }

    static isValid(blockchain) { // this function is used to check if the chain of blocks is valid or not.
        for (let i = 0; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const previousBlock = blockchain.chain[i - 1];

            if ((currentBlock.hash !== Block.getHash(currentBlock)) || (currentBlock.prevHash !== previousBlock.hash) || (!Block.hasValidTransactions(currentBlock, blockchain))
            ) {
                return false;
            }
        }
        return true
    }
}

class Transaction {
    constructor(from, to, amount, gas = 0) {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    sign(keyPair) {
        if (keyPair.getPublic("hex") === this.from) {
            this.signature = keyPair.sign(SHA256(this.from + this.to + this.amount + this.gas), "base64").toDER("hex");
        }
    }

    static isValid(transaction, chain) {
        return (
            transaction.from &&
            transaction.to &&
            transaction.amount &&
            (chain.getBalance(transaction.from) >= transaction.amount + transaction.gas || transaction.from === MINT_PUBLIC_ADDRESS) &&
            ec.keyFromPublic(transaction.from, "hex").verify(SHA256(transaction.from + transaction.to + transaction.amount + transaction.gas), transaction.signature)
        );
    }
}

const AhmedChain = new Blockchain();
// // Your original balance is 100000
// const friendWallet = ec.genKeyPair();

// // Create a Transaction
// const transaction = new Transaction(holderKeyPair.getPublic("hex"), friendWallet.getPublic("hex"), 333, 10);
// // Sign the Transaction
// transaction.sign(holderKeyPair);
// // Add The Transaction
// AhmedChain.addTransaction(transaction);
// // Mine the transaction
// AhmedChain.mineTransactions(friendWallet.getPublic("hex"));

// console.log("Your Balance: ", AhmedChain.getBalance(holderKeyPair.getPublic("hex")));
// console.log("His Balance: ", AhmedChain.getBalance(friendWallet.getPublic("hex")));

module.exports = { Block, Blockchain, AhmedChain, Transaction };

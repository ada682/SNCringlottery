const {
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
  Keypair,
} = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const base58 = require('bs58');

const DEVNET_URL = 'https://devnet.sonic.game/';
const connection = new Connection(DEVNET_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000 
});

async function sendSol(fromKeypair, toPublicKey, amount) {
  const balance = await connection.getBalance(fromKeypair.publicKey);
  console.log(`Current Balance: ${balance} lamports`);

  const lamportsToSend = amount * LAMPORTS_PER_SOL;
  console.log(`Attempting to send: ${lamportsToSend} lamports`);

  if (balance < lamportsToSend) {
    throw new Error(`Insufficient balance. Current balance: ${balance} lamports, required: ${lamportsToSend} lamports.`);
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: lamportsToSend,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
    console.log('Transaction confirmed with signature:', signature);
  } catch (error) {
    console.error('Transaction failed', error);
    if (error.logs) {
      console.error('Logs:', error.logs);
    }
    throw error;
  }
}

function generateRandomAddresses(count) {
  return Array.from({ length: count }, () =>
    Keypair.generate().publicKey.toString()
  );
}

async function getKeypairFromSeed(seedPhrase) {
  const seed = await bip39.mnemonicToSeed(seedPhrase);
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  return Keypair.fromSeed(derivedSeed.slice(0, 32));
}

async function doTransactions(transaction, keypair) {
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
    if (signature) {
      return signature;
    } else {
      throw new Error('No signature returned from transaction');
    }
  } catch (error) {
    if (error.message.includes('block height exceeded')) {
      console.error('Transaction expired: block height exceeded.');
      console.log('Retrying the transaction...');

      try {
        const retrySignature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
        if (retrySignature) {
          return retrySignature;
        } else {
          throw new Error('Retry failed, no signature returned');
        }
      } catch (retryError) {
        console.error(`Retry failed: ${retryError.message}`);
        throw retryError;
      }
    } else {
      console.error('Transaction failed', error);
      throw error;
    }
  }
}

function getKeypairFromPrivateKey(privateKey) {
  return Keypair.fromSecretKey(base58.decode(privateKey));
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  sendSol,
  generateRandomAddresses,
  getKeypairFromSeed,
  getKeypairFromPrivateKey,
  DEVNET_URL,
  connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  delay,
  doTransactions,
};

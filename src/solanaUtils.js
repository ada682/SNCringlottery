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
const colors = require('colors');

const DEVNET_URL = 'https://devnet.sonic.game/';
const connection = new Connection(DEVNET_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000 
});

async function sendSol(fromKeypair, toPublicKey, amount) {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    fromKeypair,
  ]);
  console.log(colors.green('Transaction confirmed with signature:'), signature);
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
      console.error(colors.red('Transaction expired: block height exceeded.'));
      console.log(colors.yellow('Retrying the transaction...'));

      // Retry
      try {
        const retrySignature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
        if (retrySignature) {
          return retrySignature;
        } else {
          throw new Error('Retry failed, no signature returned');
        }
      } catch (retryError) {
        console.error(colors.red(`Retry failed: ${retryError.message}`));
        throw retryError;
      }
    } else {
      console.error(colors.red('Transaction failed'), error);
      throw error;
    }
  }
}

async function getRecentBlockhashWithRetry(retryCount = 3) {
  let blockhash;
  for (let i = 0; i < retryCount; i++) {
    try {
      const { blockhash: latestBlockhash } = await connection.getRecentBlockhash();
      blockhash = latestBlockhash;
      break;
    } catch (error) {
      console.error(`Failed to get blockhash, attempt ${i + 1}: ${error.message}`);
      if (i < retryCount - 1) await delay(5000); // Retry after 5 seconds
    }
  }
  if (!blockhash) throw new Error('Unable to obtain blockhash after retries');
  return blockhash;
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

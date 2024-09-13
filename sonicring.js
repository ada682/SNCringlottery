require('dotenv').config();
const axios = require('axios').default;
const solana = require('@solana/web3.js');
const colors = require('colors');
const moment = require('moment');
const readline = require('readline');
const figlet = require('figlet');
const ora = require('ora');
const nacl = require('tweetnacl');
const chalk = require('chalk');

const { HEADERS } = require('./src/headers');
const {
  getKeypairFromPrivateKey,
  connection,
  doTransactions,
  delay
} = require('./src/solanaUtils');

function displayTitle() {
  console.log(figlet.textSync('Sonic Ring', {
    font: 'Cyberlarge',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true
  }).cyan);
  console.log('=== 🚀 Lottery Bot 3000 ==='.rainbow.bold);
}

function logWithTimestamp(message, color = 'white') {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
  console.log(`[${timestamp}] ${message}`[color] || message); 
}

async function getToken(privateKey) {
  try {
    const keypair = getKeypairFromPrivateKey(privateKey);
    const { data } = await axios({
      url: 'https://odyssey-api-beta.sonic.game/auth/sonic/challenge',
      params: { wallet: keypair.publicKey },
      headers: HEADERS,
    });

    const sign = nacl.sign.detached(Buffer.from(data.data), keypair.secretKey);
    const signature = Buffer.from(sign).toString('base64');
    const publicKey = keypair.publicKey;
    const encodedPublicKey = Buffer.from(publicKey.toBytes()).toString('base64');
    
    const response = await axios({
      url: 'https://odyssey-api-beta.sonic.game/auth/sonic/authorize',
      method: 'POST',
      headers: HEADERS,
      data: {
        address: publicKey,
        address_encoded: encodedPublicKey,
        signature,
      },
    });

    logWithTimestamp(`Token obtained: ${response.data.data.token}`, 'cyan'); // Log token for debugging
    return response.data.data.token;
  } catch (error) {
    logWithTimestamp(`Error fetching token: ${error.message}`, 'red');
    throw error;
  }
}

async function buildLotteryTx(token) {
  try {
    const { data } = await axios({
      url: 'https://odyssey-api-beta.sonic.game/user/lottery/build-tx',
      method: 'GET',
      headers: { ...HEADERS, Authorization: token },
    });
    return data.data;
  } catch (error) {
    logWithTimestamp(`Error building lottery transaction: ${error.message}`, 'red');
    throw error;
  }
}

async function participateLotteryDraw(token, signature, privateKey) {
  try {
    const response = await axios({
      url: 'https://odyssey-api-beta.sonic.game/user/lottery/draw',
      method: 'POST',
      headers: { ...HEADERS, Authorization: token },
      data: { hash: signature },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('Token might be invalid. Refreshing token...');
      
      if (!privateKey) {
        throw new Error('Private key is required to refresh token');
      }

      token = await getToken(privateKey);
      console.log('Retrying with new token...');

      const retryResponse = await axios({
        url: 'https://odyssey-api-beta.sonic.game/user/lottery/draw',
        method: 'POST',
        headers: { ...HEADERS, Authorization: token },
        data: { hash: signature },
      });
      return retryResponse.data;
    } else {
      logWithTimestamp(`Error participating in lottery draw: ${error.message}`, 'red');
      throw error;
    }
  }
}

async function checkLotteryResult(token, blockNumber) {
  try {
    const { data } = await axios({
      url: `https://odyssey-api-beta.sonic.game/user/lottery/draw/winner?block_number=${blockNumber}`,
      method: 'GET',
      headers: { ...HEADERS, Authorization: token },
    });
    return data.data;
  } catch (error) {
    logWithTimestamp(`Error checking lottery result: ${error.message}`, 'red');
    throw error;
  }
}

async function handleWalletSignatureIssue() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Detected a wallet signature issue. Would you like to continue drawing lotteries? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function askNumberOfDraws() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('berapa banyak AK47 dan RPG yang kamu mau? ', (answer) => {
      rl.close();
      const numberOfDraws = parseInt(answer);
      resolve(isNaN(numberOfDraws) ? 1 : numberOfDraws);
    });
  });
}

async function participateInRingLottery() {
  displayTitle(); 

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    logWithTimestamp('Private key not found in .env file', 'red');
    process.exit(1);
  }

  let keypair = getKeypairFromPrivateKey(privateKey);
  logWithTimestamp(`🔑 Using wallet: ${keypair.publicKey.toBase58().slice(0, 8)}...${keypair.publicKey.toBase58().slice(-8)}`, 'cyan');

  try {
    const totalDraws = await askNumberOfDraws();
    const drawsPerBatch = 50; 
    const numBatches = Math.ceil(totalDraws / drawsPerBatch);

    let token = await getToken(privateKey); 

    for (let batch = 0; batch < numBatches; batch++) {
      const batchStart = batch * drawsPerBatch;
      const batchEnd = Math.min(batchStart + drawsPerBatch, totalDraws);
      const currentBatchSize = batchEnd - batchStart;

      logWithTimestamp(`🎲 Initiating batch ${batch + 1} of ${numBatches} (${currentBatchSize} draws)`, 'yellow');
      
      let batchTasks = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        // token 
        try {
          batchTasks.push(drawLottery(token, keypair, i + 1, totalDraws, privateKey));
        } catch (error) {
          if (error.response && error.response.status === 403) {
            logWithTimestamp('sending TNT has expired...');
            token = await getToken(privateKey); // Refresh token
            logWithTimestamp('Token refreshed.');
            batchTasks.push(drawLottery(token, keypair, i + 1, totalDraws, privateKey)); 
          }
        }
      }

      await Promise.all(batchTasks); 

      if (batch < numBatches - 1) {
        const waitSpinner = ora('Waiting 49 seconds before send AK47 and $70000...').start();
        await delay(49000); // Wait 49 seconds 
        waitSpinner.succeed('Ready for next batch');
      }
    }

    logWithTimestamp('🎉 sending AK46 succses , now lets take a shoot on random people!', 'green');
  } catch (error) {
    logWithTimestamp(`❌ An error occurred: ${error.message}`, 'red');
  }
}

async function drawLottery(token, keypair, iteration, totalDraws, privateKey) {
  let result = '';
  const spinner = ora();
  try {
    spinner.start(chalk.blue(`Building Bomb and money transaction ${iteration} of ${totalDraws}`));
    const txData = await buildLotteryTx(token);
    const txBuffer = Buffer.from(txData.hash, 'base64');
    const tx = solana.Transaction.from(txBuffer);
    tx.partialSign(keypair);
    spinner.succeed(chalk.green('Lottery transaction built'));

    spinner.start(chalk.blue('Sending bomb and money transaction'));
    const signature = await doTransactions(tx, keypair);
    spinner.succeed(chalk.green(`Transaction sent. Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`));

    spinner.start(chalk.blue('Participating in 911 tragedy'));
    const drawResult = await participateLotteryDraw(token, signature, privateKey);
    spinner.succeed(chalk.green('Bomb has been defuse'));

    result += `[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${chalk.cyan('📊 Draw result:')} ${chalk.yellow(JSON.stringify(drawResult.data))}\n`;

    spinner.start(chalk.blue('Checking lottery result'));
    const blockNumber = drawResult.data.block_number;

    let lotteryResult = await checkLotteryResult(token, blockNumber);
    if (lotteryResult.winner === null) {
      spinner.warn(chalk.yellow('No winner yet, retrying sending nuke in 5 sec...'));
      await delay(5000); 
      lotteryResult = await checkLotteryResult(token, blockNumber); 
    }

    spinner.succeed(chalk.green('Lottery result received'));
    result += `[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${chalk.magenta('🏆 Result:')} ${chalk.yellow(JSON.stringify(lotteryResult))}\n`;

    await delay(1000); // 1-second delay 
  } catch (error) {
    spinner.fail(chalk.red(`Error in draw ${iteration}: ${error.message}\n`));
  }

  const watermark = chalk.bold.green(`\n\nPowered by t.me/slyntherinnn\n`);
  result += watermark;

  return result;
}

(async () => {
  await participateInRingLottery();
})();

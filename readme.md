# Sonic Ring Lottery Bot 🎰

Welcome to the Sonic Ring Lottery Bot! This automated bot participates in the Sonic Ring Lottery on your behalf, making it easier than ever to try your luck in the OKX Web3 Campaign.

## 🚀 Features

- Automatic participation in Sonic Ring Lottery draws
- Futuristic CLI interface with colorful outputs
- Handles multiple draws in a single run
- Secure private key management using environment variables
- Detailed logging of each step in the lottery process
- Error handling for common issues, including wallet signature problems

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or later) installed on your machine
- A Solana wallet with some SOL for transaction fees
- Basic knowledge of running Node.js applications

## 🛠️ Installation

1. Clone this repository:
   ```
   git clone https://github.com/ada682/SNCringlottery.git
   ```

2. Navigate to the project directory:
   ```
   cd SNCringlottery
   ```

3. Install the required dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add your Solana private key:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

   ⚠️ **IMPORTANT**: Never share your `.env` file or commit it to version control!

## 🎮 Usage

To start the bot, run:

```
npm start OR node sonicring.js
```

## 🔒 Security

This bot handles sensitive information (your private key). Always ensure:

1. Your `.env` file is listed in `.gitignore`
2. You're running this bot on a secure, private network
3. You understand the risks associated with automated trading and lottery participation

## 📜 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## 💡 Acknowledgements

- [Sonic.game](https://sonic.game) for creating the OKX Web3 Campaign
- All the awesome Node.js library creators that made this bot possible

---
NOTED : For the brutal batch at line 174 in sonicring.js, set it to whatever value you prefer. To avoid errors, just use the default value.

Happy lottery-ing! May the odds be ever in your favor! 🍀

# ChainHound - Blockchain Forensics Explorer

![ChainHound Logo](public/chainhound-logo.svg)

ChainHound is a powerful blockchain forensics tool designed to help investigators, security researchers, and cryptocurrency users track suspicious blockchain activity, identify illicit transactions, and analyze contract behavior across multiple blockchains.

## 🔍 Features

- **Multi-Chain Transaction Visualization**: Interactive graph-based visualization of blockchain transactions across Ethereum, BSC, Polygon, and more
- **Address Behavior Analysis**: Detect suspicious patterns, history poisoning attacks, and unusual transaction behaviors
- **Cross-Chain Analysis**: Track funds as they move between different blockchains through bridges
- **Smart Contract Decompilation**: Analyze contract bytecode and decompile to readable Solidity
- **Event Log Analysis**: Examine contract events to understand interactions and state changes
- **Address Labeling**: Tag and categorize addresses with custom labels and country flags
- **Case Management**: Organize investigations into cases with notes, addresses, and evidence
- **Threat Intelligence**: Database of common blockchain threats and attack vectors
- **Alerts System**: Set up custom alerts for suspicious activities
- **Report Generation**: Create comprehensive forensic reports for investigations

## 🚀 Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/covecredit/chainhound.git
cd chainhound
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## 🔧 Usage

### Transaction Visualization

The transaction visualizer allows you to see the flow of funds between addresses. You can:
- Zoom in/out and pan the visualization
- Click on addresses to see details
- Export the visualization as PNG or ZIP

### Address Analysis

Enter any blockchain address to:
- View transaction history
- Analyze behavior patterns
- Check for suspicious activities
- Add custom labels

### Smart Contract Analysis

For contract addresses, you can:
- View and decompile bytecode
- Analyze event logs
- Identify potential vulnerabilities

### Case Management

Create cases to organize your investigations:
- Add relevant addresses and contracts
- Take investigation notes
- Tag with relevant information
- Generate comprehensive reports

## 🛡️ Security Threats

ChainHound helps identify and protect against various blockchain security threats:

- **Address History Poisoning**: Attackers send small amounts from similar-looking addresses to trick users into copying the wrong address
- **Phishing Attacks**: Fake websites or messages that impersonate legitimate services
- **Token Approval Phishing**: Tricking users into approving malicious contracts to spend their tokens
- **Extension Browser Hijacking**: Malicious browser extensions that can modify blockchain transactions
- **Cross-Site Request Forgery (CSRF)**: Forcing users to execute unwanted actions on web applications they're authenticated to
- **Cross-Site Scripting (XSS)**: Injecting malicious scripts into trusted websites to steal data or modify page content
- **Fake Token Scams**: Worthless tokens that appear in wallets to lure users into interacting with malicious contracts
- **SIM Swapping**: Taking control of a victim's phone number to bypass SMS-based authentication
- **Clipboard Hijacking**: Malware that replaces copied addresses with attacker-controlled ones
- **Rug Pulls**: Project developers abandoning a project after raising funds

## 📊 Technical Details

ChainHound is built with:
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Web3.js and ethers.js for blockchain interaction
- D3.js for data visualization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 💰 Support Development

If you find ChainHound useful, please consider supporting its development with an Ethereum donation:

**ETH Address**: `0x34B362450c05b34f222a55113532c8F4b82E50CC`

Your support helps us continue to improve and maintain this tool for the blockchain security community.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- [Hacker House](https://hacker.house) for supporting the development of ChainHound
- The blockchain security community for their ongoing research and insights

## ⚠️ Disclaimer

ChainHound is provided for educational and research purposes only. Always verify findings with multiple sources before taking action based on the information provided by this tool.
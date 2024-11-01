# zPass SDK

## Running Tests

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up local devnet:
   - Clone [snarkOS](https://github.com/AleoNet/snarkOS)
   - Start local devnet in testnet mode:
     ```bash
     ./devnet
     ```
4. Deploy program to local devnet:
   ```bash
   cd program/
   leo deploy # Uses .env.example with validator 0's private key
   ```
   Note: The validator 0's private key in .env.example has test tokens for local devnet
5. Run tests:
   ```bash
   cd ..
   npm run test
   ```
   Note: Tests may take several minutes to complete

## Roadmap

- [ ] Add records finder
- [ ] Add mainnet support
- [ ] Optimise program execution
- [ ] Web Worker integration  
- [ ] Documentation and setup guide
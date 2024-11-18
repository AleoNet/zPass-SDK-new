# zPass SDK

## Running Tests

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up local devnet:
   - Clone [snarkOS](https://github.com/AleoNet/snarkOS)
   - Start local devnet in mainnet mode:
     ```bash
     ./devnet
     ```
   - Follow instructions and select `mainnet` when prompted
4. Deploy each program to local devnet:
   ```bash
   cd programs/<PROGRAM>
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
- [x] Add mainnet support
- [ ] Optimise program execution
- [ ] Web Worker integration  
- [ ] Add universal wallet adapter support
- [ ] Documentation and setup guide
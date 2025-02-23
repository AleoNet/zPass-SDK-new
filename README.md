# zPass SDK

## Testing with Example 

1. Clone this repository
2. cd into examples/
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up local devnet:
   - Clone [snarkOS](https://github.com/AleoNet/snarkOS)
   - Start local devnet in mainnet mode:
     ```bash
     ./devnet
     ```
   - Follow instructions and select `mainnet` when prompted
5. Deploy `verify_poseidon2_zpass` program to local devnet:
   ```bash
   cd programs/verify_poseidon2_zpass
   leo deploy # Uses .env.example with validator 0's private key
   ```
   Note: The validator 0's private key in .env.example has test tokens for local devnet
6. Start the example:
   ```bash
   cd ..
   npm run dev
   ```
7. Open the example in your browser and follow the instructions
8. Pull up the console and see the logs

## Roadmap

- [ ] Add records finder
- [x] Add testnet support
- [x] Add mainnet support
- [x] Add merkle root and proof generation
- [ ] Optimise program execution
- [x] Web Worker integration  
- [ ] Add universal wallet adapter support
- [x] Documentation and setup guide
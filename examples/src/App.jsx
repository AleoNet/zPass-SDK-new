import { useState } from "react";
import reactLogo from "./assets/react.svg";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import { verify_poseidon2_zpass } from "./consts/programs.js";
import { AleoWorker } from "./workers/AleoWorker.js";
import { ProgramManager } from "@provablehq/sdk/mainnet.js";

const aleoWorker = AleoWorker();
function App() {
  const [txId, setTxId] = useState(null);
  const [zPassRecord, setZPassRecord] = useState(null);

  async function initializeZPass() {
    await aleoWorker.initializeZPass({
      privateKey: "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH",
      host: "http://localhost:3030",
      network: "testnet"
    });
    alert("ZPass initialized");
  }

  async function execute() {
    const result = await aleoWorker.testZPass({
      issuerData: {
        issuer: "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px",
        subject: "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px",
        dob: "20000101u32",
        nationality: "123field",
        expiry: "20000101u32",
        salt: "123scalar",
      },
      programName: "verify_poseidon2_zpass.aleo",
      functionName: "issue",
    });
    console.log("Broadcasted with tx id: ", result);

    alert(JSON.stringify(result));
  }

  async function getZPassFromTxId() {
    if (!txId) {
      alert("Please enter a transaction ID");
      return;
    }
    const result = await aleoWorker.getZPass(txId);
    console.log("ZPass: ", result);
    alert(JSON.stringify(result));
  }

  async function usageTest() {
    if (!zPassRecord) {
      alert("Please get a ZPass record first");
      return;
    }
    const result = await aleoWorker.testZPassUsage({
      programName: "zpass_usage_test.aleo",
      functionName: "verify_zpass",
      fee: 100000,
      inputs: [`"${zPassRecord}"`],
    });
    console.log("Broadcasted with tx id: ", result);
  }

  return (
    <>
      <div>
        <a href="https://provable.com" target="_blank">
          <img src={aleoLogo} className="logo" alt="Aleo logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Aleo + React</h1>
      <div className="card">
        <p>
          <button onClick={initializeZPass}>
            {"Initialize ZPass"}
          </button>
        </p>
        <p>
          <button onClick={execute}>
            {"Run testZPass"}
          </button>
        </p>
        <p>
          <input
            type="text"
            placeholder="Enter transaction ID"
            value={txId || ""}
            onChange={(e) => setTxId(e.target.value)}
            className="transaction-input"
          />
        </p>
        <p>
          <button onClick={getZPassFromTxId}>
            {"Get ZPass from txid"}
          </button>
        </p>
        <p>
          <input
            type="text"
            placeholder="Enter ZPass Record"
            value={zPassRecord || ""}
            onChange={(e) => setZPassRecord(e.target.value)}
            className="transaction-input"
          />
        </p>
        <p>
          <button onClick={usageTest}>
            {"Test ZPass usage"}
          </button>
        </p>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
    </>
  );
}

export default App;

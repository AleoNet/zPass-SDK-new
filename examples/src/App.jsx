import { useState } from "react";
import reactLogo from "./assets/react.svg";
import aleoLogo from "./assets/aleo.svg";
import "./App.css";
import { verify_poseidon2_zpass } from "./consts/programs.js";
import { AleoWorker } from "./workers/AleoWorker.js";

const aleoWorker = AleoWorker();
function App() {
  const [executing, setExecuting] = useState(false);
  const [txId, setTxId] = useState(null);

  async function initializeZPass() {
    await aleoWorker.initializeZPass({
      privateKey: "APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH",
      host: "http://localhost:3030",
    });
    alert("ZPass initialized");
  }

  async function execute() {
    setExecuting(true);
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
    setExecuting(false);
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
          <input
            type="text"
            placeholder="Enter transaction ID"
            value={txId || ""}
            onChange={(e) => setTxId(e.target.value)}
            className="transaction-input"
          />
        </p>
        <p>
          <button onClick={initializeZPass}>
            {"Initialize ZPass"}
          </button>
        </p>
        <p>
          <button disabled={executing} onClick={execute}>
            {"Run testZPass"}
          </button>
        </p>
        <p>
          <button onClick={getZPassFromTxId}>
            {"Get ZPass from txid"}
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

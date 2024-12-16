import { ZPassSDK, HashAlgorithm, initThreadPool } from "zpass-sdk";
import { expose } from "comlink";

let zpass = null;

await initThreadPool();

async function initializeZPass({privateKey, host}) {
  zpass = new ZPassSDK({
    privateKey,
    host,
  });
}

async function testZPass({issuerData, programName, functionName}) {
  const { issuer, subject, dob, nationality, expiry, salt } = issuerData;

  console.log(issuerData);
  const { signature } = await zpass.signCredential({
    data: {
      issuer: issuer,
      subject: subject,
      dob: dob,
      nationality: nationality,
      expiry: expiry,
      salt: salt,
    },
    hashType: HashAlgorithm.POSEIDON2,
  });

  const tx_id = await zpass.issueZPass({
    programName,
    functionName: functionName,
    inputs: [signature, `{
      issuer: ${issuer},
      subject: ${subject},
      dob: ${dob},
      nationality: ${nationality},
      expiry: ${expiry}
    }`,
      `{ salt: ${salt} }`,
    ],
    fee: 300000,
  });

  return tx_id;
}

async function getZPass(transactionId) {
  if (!zpass) {
    throw new Error("ZPass SDK not initialized");
  }

  return zpass.getZPassRecord(transactionId);
}

async function testZPassUsage({programName, functionName, inputs, fee}) {
  const tx_id = await zpass.issueZPass({
    programName,
    functionName,
    inputs,
    fee
  });

  return tx_id;
}

const workerMethods = { testZPass, testZPassUsage, getZPass, initializeZPass };
expose(workerMethods);

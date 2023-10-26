// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");
import { encodeFunctionData, hexToString, getAddress, stringToHex } from "viem";
import { storageabi } from "./contracts";

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);
const storage_contract_address = getAddress(
  "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
);
let Storage_value = BigInt(0);
//for goerli 0xf1a0B31f4647e4F403e420AD90E7a1fbb53c4f13
// for localhost   "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"

async function handle_advance(data: any) {
  console.log("Received advance request data " + JSON.stringify(data));
  const payload = data.payload;
  let JSONpayload: any = {};
  try {
    const payloadStr = hexToString(payload);
    JSONpayload = JSON.parse(payloadStr);
    console.log(`received request "${JSON.stringify(JSONpayload)}"`);
  } catch (e) {
    console.log(`Adding notice with binary value "${payload}"`);
    await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: payload, error: e }),
    });
    return "accept";
  }
  let advance_req;

  if (JSONpayload.method === "store_value") {
    console.log("storing the new value");

    const call = encodeFunctionData({
      abi: storageabi,
      functionName: "store",
      args: [JSONpayload.value],
    });
    let voucher = {
      destination: storage_contract_address, // dapp Address
      payload: call,
    };
    console.log(voucher);
    advance_req = await fetch(rollup_server + "/voucher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(voucher),
    });
    console.log("starting a voucher");
  } else if (JSONpayload.method === "get_value") {
    console.log("fetching the stored value");
    const result = JSON.stringify({ value: Storage_value.toString() });
    const hexresult = stringToHex(result);
    advance_req = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: hexresult }),
    });
  } else {
    advance_req = await fetch(rollup_server + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
    });
  }
  const json = await advance_req.json();
  console.log(
    "Received  status " +
      advance_req.status +
      " with body " +
      JSON.stringify(json)
  );
  return "accept";
}

async function handle_inspect(data: any) {
  console.log("Received inspect request data " + JSON.stringify(data));
  const payload = data.payload;
  let inspect_req;
  try {
    const payloadStr = hexToString(payload);
    console.log("received inspect request with payload", payloadStr);
    if (payloadStr === "storage") {
      console.log("fetching the stored value result", Storage_value);
      inspect_req = await fetch(rollup_server + "/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value: Storage_value }),
      });
      console.log("Adding report with" + inspect_req.status);
      return "accept";
    }
  } catch (e) {
    console.log(`Adding report with binary value "${payload}"`);
  }
  inspect_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload }),
  });
  console.log("Adding report with" + inspect_req.status);
  return "accept";
}

var handlers: any = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req.request_type];
      finish.status = await handler(rollup_req.data);
    }
  }
})();

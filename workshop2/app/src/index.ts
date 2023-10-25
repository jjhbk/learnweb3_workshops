// XXX even though ethers is not used in the code below, it's very likely
// it will be used by any DApp, so we are already including it here
const { ethers } = require("ethers");
import { encodeFunctionData, getAddress } from "viem";
import { storageabi } from "./contracts";
const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);
const storage_address = getAddress(
  "0xf1a0B31f4647e4F403e420AD90E7a1fbb53c4f13"
);
//for goerli 0xf1a0B31f4647e4F403e420AD90E7a1fbb53c4f13
// for localhost   "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d"
async function handle_advance(data: any) {
  console.log("Received advance request data " + JSON.stringify(data));
  const payload = data["payload"];
  try {
    const payloadStr = ethers.utils.toUtf8String(payload);
    console.log(`Adding notice "${payloadStr}"`);
  } catch (e) {
    console.log(`Adding notice with binary value "${payload}"`);
  }
  let advance_req;

  if (payload == "0x766f7563686572") {
    const call = encodeFunctionData({
      abi: storageabi,
      functionName: "store",
      args: [123124554],
    });
    let voucher = {
      destination: storage_address, // dapp Address
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
  } else if (payload == "0x6e6f74696365") {
    advance_req = await fetch(rollup_server + "/notice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload }),
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
  const payload = data["payload"];
  try {
    const payloadStr = ethers.utils.toUtf8String(payload);
    console.log(`Adding report "${payloadStr}"`);
  } catch (e) {
    console.log(`Adding report with binary value "${payload}"`);
  }
  const inspect_req = await fetch(rollup_server + "/report", {
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
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();

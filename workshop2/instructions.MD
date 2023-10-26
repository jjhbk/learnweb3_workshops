# Workshop2

## Requirements

---

1. [docker-desktop](https://www.docker.com/products/docker-desktop/)
2. [sunodo](https://docs.sunodo.io/)
3. [forge](https://book.getfoundry.sh/reference/forge/forge-install)
4. [Qemu](https://github.com/multiarch/qemu-user-static)
5. yarn
6. npm
7. curl

## Initialize

---

`sunodo --help`

`sunodo create <app name> --template javascript | typescript | go`

## Build

---

`sunodo build`

## Run

`sunodo run `

run with complete logs

`sunodo run --verbose`

---

## Run in HostMode

`sunodo run --no-backend`

open a second terminal

`yarn build && yarn start`

## Interacting with a frontend

`git clone https://github.com/prototyp3-dev/frontend-web-cartesi`
`cd frontend-web-cartesi`
`yarn && yarn codegen && yarn start`

## Building a Dapp with full functionality

### Inspect State request

```typescript
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
```

### Add Storage contract to foudry Anvil node

```
connect remix to local node using the extenal http connection
compile the storage.sol contract
deploy the storage.sol cotnract
copy the ABI to file
```

### Add Handle_advance request

```
const storage_contract_address = getAddress(<storage_contract_address>);
let Storage_value = 0;
```

store value functionality

```typescript
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
}
```

fetch value functionality

```typescript
else if (JSONpayload.method === "get_value") {
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
  }
```

full handle advance function

```typescript
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
```

### Executing vouchers

#### Advance time

`cast rpc evm_setNextBlockTimestamp 653BF57C`

## Deploying Dapps to network

### Requirements

1. alchemy account
2. Wallet seed
3. Test Ether

### Clone deploy scripts

`git clone https://github.com/jjhbk/sunodo-deploy`

### Set the environment variables

`export MNEMONIC=<user sequence of twelve words>`

`export RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<USER_KEY>`

`export WSS_URL=wss://eth-sepolia.g.alchemy.com/v2/<USER_KEY>`

### Deploy the DApp contract

`./run-deploy.sh sepolia`

### Run Validator for the deployed DApp

`./run-validator sepolia <DApp Address>`

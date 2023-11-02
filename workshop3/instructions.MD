# Workshop3 NFT marketPlace

## Backend

---

### initialize the app

`sunodo create backend --template typescript`

### create different output classes

`touch outputs.ts`

add imports

```typescript
import { stringToHex, bytesToHex, Address, ByteArray } from "viem";
```

define general class Output

```typescript
class Output {
  payload: string;
  type: string;
  constructor(_payload: string) {
    this.type = "output";
    if (_payload.slice(0, 2) === "0x") {
      this.payload = _payload;
    } else {
      this.payload = stringToHex(_payload);
    }
  }
}
```

define Voucher class which extends Output

```typescript
class Voucher extends Output {
  destination: Address;
  constructor(_destination: Address, _payload: ByteArray) {
    let hexpayload = bytesToHex(_payload);
    super(hexpayload);
    this.type = "voucher";
    this.destination = _destination;
  }
}
```

define Notice,Report,Log,Error_out classes which extend Output

```typescript
class Notice extends Output {
  constructor(_payload: string) {
    super(_payload);
    this.type = "notice";
  }
}
class Report extends Output {
  constructor(_payload: string) {
    super(_payload);
    this.type = "report";
  }
}

class Log extends Output {
  constructor(_payload: string) {
    super(_payload);
    this.type = "log";
  }
}

class Error_out extends Output {
  constructor(_payload: string) {
    super(_payload);
    this.type = "error";
  }
}
```

export these classes

```typescript
export { Voucher, Notice, Log, Report, Error_out, Output };
```

---

### Create Balance class

`touch balance.ts`

add imports

```typescript
import { Address } from "viem";
```

define Balance class

```typescript
class Balance {
  private account: string;
  private ether: bigint;
  private _erc721: Map<Address, Set<number>>;
  constructor(
    account: string,
    ether: bigint,
    erc721: Map<Address, Set<number>>
  ) {
    this.account = account;
    this._erc721 = erc721;
    this.ether = ether;
  }
}
```

add get methods

```typescript
  ether_get(): bigint {
    return this.ether;
  }

  list_erc721(): Map<Address, Set<number>> {
    return this._erc721;
  }

  erc721_get(erc721: Address): Set<number> | undefined {
    return this._erc721.get(erc721);
  }

```

add increase_ether method

```typescript
  ether_increase(amount: bigint): void {
    if (amount < 0) {
      throw new Error(
        `failed to increase balance of ether for ${this.account}`
      );
      return;
    }
    this.ether = this.ether + amount;
  }
```

add decrease_ether method

```typescript
  ether_decrease(amount: bigint): void {
    if (amount < 0) {
      throw new Error(
        `failed to decrease balance of ether for ${this.account}`
      );
    }

    if (this.ether < amount) {
      throw new Error(`failed to decrease balancefor ${this.account}`);
      return;
    }
    this.ether = this.ether - amount;
  }
```

add erc721_add method

```typescript
 erc721_add(erc721: Address, token_id: number) {
    if (this._erc721.get(erc721) === undefined) {
      this._erc721.set(erc721, new Set());
    }
    let tokens = this._erc721.get(erc721);
    if (tokens) {
      tokens.add(token_id);
    } else {
      const set: any = this._erc721.get(erc721);
      set.add(token_id);
      this._erc721.set(erc721, set);
    }
  }
```

add erc721_remove method

```typescript
  erc721_remove(erc721: Address, token_id: number) {
    if (this._erc721.get(erc721) === undefined) {
      this._erc721.set(erc721, new Set<number>());
      throw new Error(
        `failed to remove token ${erc721}, id:${token_id} from ${this.account}`
      );
      return;
    }
    let tokens = this._erc721.get(erc721);

    try {
      tokens?.delete(token_id);
    } catch (e) {
      throw new Error(
        `failed to remove token ${erc721}, id:${token_id} from ${this.account}`
      );
    }
  }
```

export class

```typescript
export { Balance };
```

### Import CartesiDAppABI and ERC721ABI

`touch rollups.ts`

### Create Wallet class to manage assets

`touch wallet.ts`

add imports

```typescript
import { Voucher, Notice, Error_out, Output, Report } from "./outputs";
import { Balance } from "./balance";
import {
  encodeFunctionData,
  getAddress,
  Address,
  hexToBytes,
  parseEther,
} from "viem";
import { CartesiDappABI, erc20ABI, erc721ABI } from "./rollups";
import { ethers } from "ethers";
```

define Wallet class

```typescript
class Wallet {
  static accounts: Map<Address, Balance>;
  static listedAssets: Map<string, bigint>;
  constructor(
    accounts: Map<Address, Balance>,
    listedAssets: Map<string, bigint>
  ) {
    Wallet.accounts = accounts;
    Wallet.listedAssets = listedAssets;
  }
}
```

add get methods

```typescript
  private _balance_get = (_account: Address): Balance => {
    let balance = Wallet.accounts.get(_account);
    if (balance === undefined || !balance) {
      Wallet.accounts.set(
        _account,
        new Balance(_account, BigInt(0), new Map(), new Map())
      );
      balance = <Balance>Wallet.accounts.get(_account);
    }
    return balance;
  };

  balance_get = (_account: Address): Balance => {
    //Retrieve balance of all ERC20 and ERC721 tokens for account
    console.info(`Balance for ${_account} retrieved`);
    return this._balance_get(_account);
  };

  listedAssets_get = () => {
    return Wallet.listedAssets;
  };

```

add private request parse methods

```typescript
private _ether_deposit_parse = (_payload: string): [Address, bigint] => {
    try {
      let input_data = [];

      input_data[0] = ethers.dataSlice(_payload, 0, 20);
      input_data[1] = ethers.dataSlice(_payload, 20, 52);

      if (!input_data[0]) {
        throw new Error("ether deposit unsuccessful");
        return ["0x0", BigInt(0)];
      }
      console.debug("input data is", input_data);
      return [
        getAddress(input_data[0]),
        parseEther(String(parseInt(input_data[1])), "gwei"),
      ];
    } catch (e) {
      throw new Error(String(e));
      return ["0x0", BigInt(0)];
    }
  };

 private _erc721_deposit_parse = (
    _payload: string
  ): [Address, Address, number] => {
    try {
      let input_data = [];
      input_data[0] = ethers.dataSlice(_payload, 0, 20);
      input_data[1] = ethers.dataSlice(_payload, 20, 40);
      input_data[2] = ethers.dataSlice(_payload, 40, 72);
      if (!input_data[0]) {
        throw new Error("erc721 deposit unsuccessful");
        return ["0x0", "0x0", 0];
      }
      console.log("input data is ", input_data);
      return [
        getAddress(input_data[0]),
        getAddress(input_data[1]),
        parseInt(input_data[2]),
      ];
    } catch (e) {
      throw new Error(String(e));
      return ["0x0", "0x0", 0];
    }
  };

```

add private deposit helper methods

```typescript
  private _ether_deposit = (account: Address, amount: bigint) => {
    let balance = this._balance_get(account);
    console.log("balance is", balance);
    balance.ether_increase(amount);
    let notice_payload: any = {
      type: "etherdeposit",
      content: {
        address: account,
        amount: amount.toString(),
      },
    };
    return new Notice(JSON.stringify(notice_payload));
  };

  private _erc721_deposit = (
    account: Address,
    erc721: Address,
    token_id: number
  ) => {
    try {
      let balance = this._balance_get(account);
      balance.erc721_add(erc721, token_id);
      let notice_payload = {
        type: "erc721deposit",
        content: {
          address: account,
          erc721: erc721,
          token_id: token_id.toString(),
        },
      };
      return new Notice(JSON.stringify(notice_payload));
    } catch (e) {
      return new Error_out(`unable to deposit erc721 ${e}`);
    }
  };
```

add public deposit methods

```typescript
ether_deposit_process = (_payload: string): Output => {
  try {
    let [account, amount] = this._ether_deposit_parse(_payload);
    console.info(`${amount} ether deposited to account ${account}`);
    return this._ether_deposit(account, amount);
  } catch (e) {
    return new Error_out(String(e));
  }
};

erc721_deposit_process = (_payload: string): Output => {
  try {
    let [erc721, account, token_id] = this._erc721_deposit_parse(_payload);
    console.info(
      `Token ERC-721 ${erc721} id: ${token_id} deposited in ${account}`
    );
    return this._erc721_deposit(account, erc721, token_id);
  } catch (e) {
    return new Error_out(String(e));
  }
};
```

add withdraw methods

```typescript
ether_withdraw = (
  rollup_address: Address,
  account: Address,
  amount: bigint
) => {
  try {
    let balance = this._balance_get(account);
    balance.ether_decrease(amount);
    const call = encodeFunctionData({
      abi: CartesiDappABI,
      functionName: "withdrawEther",
      args: [getAddress(account), amount],
    });
    return new Voucher(rollup_address, hexToBytes(call));
  } catch (e) {
    console.log(e);
    return new Error_out(`error withdrawing ether ${e}`);
  }
};

erc721_withdraw = (
  rollup_address: Address,
  sender: Address,
  erc721: Address,
  token_id: number
) => {
  try {
    let balance = this._balance_get(sender);
    balance.erc721_remove(erc721, token_id);
  } catch (e) {
    return new Error_out(String(e));
  }
  let payload = encodeFunctionData({
    abi: erc721ABI,
    functionName: "safeTransferFrom",
    args: [getAddress(rollup_address), sender, token_id],
  });
  console.info(
    `Token ERC-721:${erc721} ,id:${token_id} withdrawn from ${sender}`
  );
  return new Voucher(erc721, hexToBytes(payload));
};
```

add transfer methods

```typescript
ether_transfer = (account: Address, to: Address, amount: bigint) => {
  try {
    let balance = this._balance_get(account);
    let balance_to = this._balance_get(to);
    balance.ether_decrease(amount);
    balance_to.ether_increase(amount);
    let notice_payload = {
      type: "erc20transfer",
      content: {
        from: account,
        to: to,
        amount: amount.toString(),
      },
    };
    console.info(`${amount} ether transferred from ${account} to ${to}`);
    return new Notice(JSON.stringify(notice_payload));
  } catch (e) {
    console.log(e);

    return new Error_out(String(e));
  }
};

erc721_transfer = (
  account: Address,
  to: Address,
  erc721: Address,
  token_id: number
) => {
  try {
    let balance = this._balance_get(account);
    let balance_to = this._balance_get(to);
    balance.erc721_remove(erc721, token_id);
    balance_to.erc721_add(erc721, token_id);
    let notice_payload = {
      type: "erc721transfer",
      content: {
        from: account,
        to: to,
        erc721: erc721,
        token_id: token_id.toString(),
      },
    };
    console.info(
      `Token ERC-721 ${erc721} id:${token_id} transferred from ${account} to ${to}`
    );
    return new Notice(JSON.stringify(notice_payload));
  } catch (e) {
    return new Error_out(String(e));
  }
};
```

add Asset methods

```typescript
listAsset = (
  account: Address,
  erc721: Address,
  token_id: number,
  amount: bigint
) => {
  if (amount < 0) {
    throw new Error("invalid listing amount must be greater than 0");
  }
  const balance = this._balance_get(account);
  const tokens = balance.erc721_get(erc721);
  if (tokens === undefined) {
    return new Error_out("Only the owner of the asset can list it for sale");
  }
  let owner = false;
  for (const value of tokens) {
    if (value === token_id) {
      owner = true;
      break;
    }
  }
  if (!owner) {
    return new Error_out("Only the owner of the asset can list it for sale");
  }
  Wallet.listedAssets.set(String(erc721 + "id:" + token_id), amount);
  return new Notice(
    `Listed asset ${erc721} with id ${token_id} for ${amount.toString()} `
  );
};

buyAsset = (
  account: Address,
  erc721: Address,
  from: Address,
  token_id: number,
  amount: bigint
) => {
  if (amount < 0) {
    throw new Error("invalid listing amount must be greater than 0");
  }
  try {
    let balance = this._balance_get(account);
    let balance_from = this._balance_get(from);
    balance_from.ether_increase(amount);
    balance.ether_decrease(amount);
    balance_from.erc721_remove(erc721, token_id);
    balance.erc721_add(erc721, token_id);
    Wallet.listedAssets.delete(String(erc721 + "id:" + token_id));

    let notice_payload = {
      type: "Assetsale",
      content: {
        from: from,
        to: account,
        erc721: erc721,
        token_id: token_id,
        amount: amount.toString,
      },
    };

    console.info(`Asset bought ${notice_payload}`);
    return new Notice(JSON.stringify(notice_payload));
  } catch (e) {
    console.log(e);
    return new Error_out(String(e));
  }
};
```

export class

```typescript
export { Wallet };
```

### Create router for different functions

`touch router.ts`

add imports

```typescript
import { hexToString, getAddress } from "viem";
import { Error_out, Log, Notice, Output, Report } from "./outputs";
import { Wallet } from "./wallet";
```

define default route

```typescript
class DefaultRoute {
  public execute = (request: any): Output | Set<Output> => {
    return new Error_out("Operation not implemented");
  };
}
```

define Router class

```typescript
class Router {
  controllers: Map<string, DefaultRoute>;
  constructor(wallet: Wallet) {
    this.controllers = new Map();
  }
  process(route: string, request: any) {
    route = route.toLowerCase();
    const controller = this.controllers.get(route);
    if (!controller) {
      return new Error_out(`operation ${route} is not supported`);
    }
    console.info(`executing operation ${route}`);
    return controller.execute(request);
  }
}
```

add AdvanceRoute which extends default Route

```typescript
class AdvanceRoute extends DefaultRoute {
  msg_sender!: string;
  msg_timestamp!: Date;
  request_args: any;
  public parse_request = (request: any) => {
    this.msg_sender = request.metadata.msg_sender;
    this.msg_timestamp = new Date(request.metadata.timestamp);
    const request_payload = JSON.parse(hexToString(request.payload));
    this.request_args = request_payload.args;
  };
  public execute = (request: any): Output | Set<Output> => {
    if (request) {
      this.parse_request(request);
    }
    return new Log("parsing advance state request");
  };
}
```

add WalletRoute which extends AdvanceRoute

```typescript
class WalletRoute extends AdvanceRoute {
  wallet: Wallet;
  constructor(wallet: Wallet) {
    super();
    this.wallet = wallet;
  }
}
```

add depositRoutes which extend WalletRoute

```typescript
class DepositEther extends WalletRoute {
  public execute = (request: any) => {
    return this.wallet.ether_deposit_process(request);
  };
}

class DepositERC721Route extends WalletRoute {
  execute = (request: any) => {
    return this.wallet.erc721_deposit_process(request);
  };
}
```

add Transfer Routes which extend WalletRoute

```typescript
class TransferEther extends WalletRoute {
  public execute = (request: any) => {
    this.parse_request(request);
    return this.wallet.ether_transfer(
      getAddress(this.msg_sender),
      getAddress(this.request_args.to.toLowerCase()),
      BigInt(this.request_args.amount)
    );
  };
}

class TransferERC721Route extends WalletRoute {
  public execute = (request: any) => {
    this.parse_request(request);
    return this.wallet.erc721_transfer(
      getAddress(this.msg_sender),
      getAddress(this.request_args.to.toLowerCase()),
      getAddress(this.request_args.erc721.toLowerCase()),
      parseInt(this.request_args.token_id)
    );
  };
}
```

add Withdraw Routes which extend WalletRoute

```typescript
class WithdrawEther extends WalletRoute {
  rollup_address: any;
  constructor(wallet: Wallet) {
    super(wallet);
    this.rollup_address = null;
  }
  public get_rollup_address = () => {
    return this.rollup_address;
  };
  public set_rollup_address = (value: string) => {
    this.rollup_address = value;
  };

  public execute = (request: any): Output => {
    this.parse_request(request);
    if (!this.rollup_address) {
      return new Error_out("DApp address is needed to withdraw the assett");
    }
    return this.wallet.ether_withdraw(
      getAddress(this.rollup_address),
      getAddress(this.msg_sender),
      BigInt(this.request_args.amount)
    );
  };
}

class WithdrawERC721Route extends WalletRoute {
  rollup_address: any;
  constructor(wallet: Wallet) {
    super(wallet);
    this.rollup_address = null;
  }
  public get_rollup_address = () => {
    return this.rollup_address;
  };
  public set_rollup_address = (value: string) => {
    this.rollup_address = value;
  };
  public execute = (request: any) => {
    this.parse_request(request);
    if (!this.rollup_address) {
      return new Error_out("DApp address is needed to withdraw the assett");
    }
    return this.wallet.erc721_withdraw(
      getAddress(this.rollup_address),
      getAddress(this.msg_sender),
      getAddress(this.request_args.erc721.toLowerCase()),
      parseInt(this.request_args.token_id)
    );
  };
}
```

add assets routes

```typescript
class GetListedAssetsRoute extends WalletRoute {
  constructor(wallet: Wallet) {
    super(wallet);
  }
  public execute = (request: any) => {
    try {
      const allAssets = this.wallet.listedAssets_get();
      console.log("all listed assets are:", allAssets);
      return new Report(JSON.stringify({ assets: Array.from(allAssets) }));
    } catch (e) {
      return new Error_out(String(e));
    }
  };
}

class ListAssetRoute extends WalletRoute {
  public execute = (request: any) => {
    this.parse_request(request);
    return this.wallet.buyAsset(
      getAddress(this.msg_sender),
      getAddress(this.request_args.to.toLowerCase()),
      getAddress(this.request_args.erc721.toLowerCase()),
      parseInt(this.request_args.token_id),
      BigInt(this.request_args.amount)
    );
  };
}

class BuyAssetsRoute extends WalletRoute {
  public execute = (request: any) => {
    this.parse_request(request);
    return this.wallet.buyAsset(
      getAddress(this.msg_sender),
      getAddress(this.request_args.to.toLowerCase()),
      getAddress(this.request_args.erc721.toLowerCase()),
      parseInt(this.request_args.token_id),
      BigInt(this.request_args.amount)
    );
  };
}
```

add Balance Route

```typescript
class BalanceRoute extends WalletRoute {
  public execute = (request: any) => {
    console.log("request is ", request);
    const accbalance = this.wallet.balance_get(getAddress(request));
    console.log("complete balance is", accbalance);
    try {
      const ether = accbalance.ether_get().toString();
      let erc721new = new Map();
      const erc721: any = accbalance.list_erc721();
      for (let [key, value] of erc20) {
        erc20new.set(key, value.toString());
      }
      console.log(ether, erc721);
      for (let [key, value] of erc721) {
        erc721new.set(key, Array.from(value));
      }
      return new Report(
        JSON.stringify({
          ether: ether,
          erc721: Array.from(erc721new),
        })
      );
    } catch (e) {
      return new Error_out(String(e));
    }
  };
}
```

modify Rouer class

```typescript
constructor(wallet: Wallet) {
    this.controllers = new Map();
    this.controllers.set("ether_deposit", new DepositEther(wallet));
    this.controllers.set("erc721_deposit", new DepositERC721Route(wallet));
    this.controllers.set("balance", new BalanceRoute(wallet));
    this.controllers.set("ether_withdraw", new WithdrawEther(wallet));
    this.controllers.set("ether_transfer", new TransferEther(wallet));
    this.controllers.set("erc721_withdraw", new WithdrawERC721Route(wallet));
    this.controllers.set("erc721_transfer", new TransferERC721Route(wallet));
    this.controllers.set("listAssets",new GetListedAssetsRoute(wallet));
    this.controllers.set("list_asset", new ListAssetRoute(wallet));
    this.controllers.set("buy_asset",new BuyAssetsRoute(wallet));
  }
set_rollup_address(rollup_address: string) {
    const controller = <WithdrawERC721Route>(
      this.controllers.get("erc721_withdraw")
    );
    controller.set_rollup_address(rollup_address);

    const controller2 = <WithdrawEther>this.controllers.get("ether_withdraw");
    controller2.set_rollup_address(rollup_address);
}
```

export class

```typescript
export { Router };
```

### modify tsconfig

add `"resolveJsonModule": true,` to tsconfig.json

### Backend code

`rm index.ts && touch index.ts`

add imports

```typescript
import { hexToBytes, hexToString, stringToBytes, stringToHex } from "viem";
import { Notice, Output, Voucher, Report, Error_out, Log } from "./outputs";
import { Router } from "./router";
import { Wallet } from "./wallet";

import erc20_portal from "./deployments/localhost/ERC20Portal.json";
import erc_721_portal from "./deployments/localhost/ERC721Portal.json";
import dapp_address_relay from "./deployments/localhost/DAppAddressRelay.json";
import ether_portal from "./deployments/localhost/EtherPortal.json";
```

initializing variables

```typescript
let rollup_address = "";
const rollup_server: string = <string>process.env.ROLLUP_HTTP_SERVER_URL;
let Network: string = "localhost";
const wallet = new Wallet(new Map(), new Map());
const router = new Router(wallet);
console.info("MarketPlace App Started");
```

send requests

```typescript
const send_request = async (output: Output | Set<Output>) => {
  if (output instanceof Output) {
    let endpoint;
    console.log("type of output", output.type);

    if (output.type == "notice") {
      endpoint = "/notice";
    } else if (output.type == "voucher") {
      endpoint = "/voucher";
    } else {
      endpoint = "/report";
    }

    console.log(`sending request ${typeof output}`);
    const response = await fetch(rollup_server + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(output),
    });
    console.debug(
      `received ${output.payload} status ${response.status} body ${response.body}`
    );
  } else {
    output.forEach((value: Output) => {
      send_request(value);
    });
  }
};
```

handle_advance method

```typescript
async function handle_advance(data: any) {
  console.log("Received advance request data " + JSON.stringify(data));
  try {
    const payload = data.payload;
    const msg_sender: string = data.metadata.msg_sender;
    console.log("msg sender is", msg_sender.toLowerCase());
    const payloadStr = hexToString(payload);

    if (msg_sender.toLowerCase() === ether_portal.address.toLowerCase()) {
      try {
        return router.process("ether_deposit", payload);
      } catch (e) {
        return new Error_out(`failed to process ether deposti ${payload} ${e}`);
      }
    }
    if (msg_sender.toLowerCase() === dapp_address_relay.address.toLowerCase()) {
      rollup_address = payload;
      router.set_rollup_address(rollup_address);
      console.log("Setting DApp address");
      return new Notice(
        `DApp address set up successfully to ${rollup_address}`
      );
    }

    if (msg_sender.toLowerCase() === erc_721_portal.address.toLowerCase()) {
      try {
        return router.process("erc721_deposit", payload);
      } catch (e) {
        return new Error_out(`failed ot process ERC20Deposit ${payload} ${e}`);
      }
    }
    try {
      const jsonpayload = JSON.parse(payloadStr);
      console.log("payload is");
      return router.process(jsonpayload.method, data);
    } catch (e) {
      return new Error_out(`failed to process command ${payloadStr} ${e}`);
    }
  } catch (e) {
    console.error(e);
    return new Error_out(`failed to process advance_request ${e}`);
  }
}
```

handle inspect method

```typescript
async function handle_inspect(data: any) {
  console.debug(`received inspect request data${data}`);
  try {
    const url = hexToString(data.payload).split("/");
    console.log("url is ", url);
    return router.process(<string>url[0], url[1]);
  } catch (e) {
    const error_msg = `failed to process inspect request ${e}`;
    console.debug(error_msg);
    return new Error_out(error_msg);
  }
}
```

Query for new requests

```typescript
var handlers: any = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };
console.info("MarketPlace App Started");

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

      var typeq = rollup_req.request_type;
      var handler: any;
      if (typeq === "inspect_state") {
        handler = handlers.inspect_state;
      } else {
        handler = handlers.advance_state;
      }
      var output = await handler(rollup_req.data);
      finish.status = "accept";
      if (output instanceof Error_out) {
        finish.status = "reject";
      }
      await send_request(output);
    }
  }
})();
```

---

## Frontend

## clone repo

`git clone https://github.com/prototyp3-dev/frontend-web-cartesi`

`yarn && yarn codegen && yarn start`

import { hexToString, getAddress } from "viem";
import { Error_out, Log, Notice, Output, Report } from "./outputs";
import { Wallet } from "./wallet";

class DefaultRoute {
  public execute = (request: any): Output | Set<Output> => {
    return new Error_out("Operation not implemented");
  };
}

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

class WalletRoute extends AdvanceRoute {
  wallet: Wallet;
  constructor(wallet: Wallet) {
    super();
    this.wallet = wallet;
  }
}

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
class GetListedAssetsRoute extends WalletRoute {
  constructor(wallet: Wallet) {
    super(wallet);
  }
  public execute = (request: any) => {
    try {
      const allAssets = this.wallet.listedAssets_get();
      const assetmap = new Map();
      for (let [key, value] of allAssets) {
        assetmap.set(key, value.toString());
      }
      console.log("all listed assets are:", allAssets);
      return new Report(JSON.stringify({ assets: Array.from(assetmap) }));
    } catch (e) {
      return new Error_out(String(e));
    }
  };
}

class ListAssetRoute extends WalletRoute {
  public execute = (request: any) => {
    this.parse_request(request);
    return this.wallet.listAsset(
      getAddress(this.msg_sender),
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
      getAddress(this.request_args.from.toLowerCase()),
      getAddress(this.request_args.erc721.toLowerCase()),
      parseInt(this.request_args.token_id),
      BigInt(this.request_args.amount)
    );
  };
}

class BalanceRoute extends WalletRoute {
  public execute = (request: any) => {
    console.log("request is ", request);
    const accbalance = this.wallet.balance_get(getAddress(request));
    console.log("complete balance is", accbalance);
    try {
      const ether = accbalance.ether_get().toString();
      let erc721new = new Map();
      const erc721: any = accbalance.list_erc721();
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

class Router {
  controllers: Map<string, DefaultRoute>;
  constructor(wallet: Wallet) {
    this.controllers = new Map();
    this.controllers.set("ether_deposit", new DepositEther(wallet));
    this.controllers.set("erc721_deposit", new DepositERC721Route(wallet));
    this.controllers.set("balance", new BalanceRoute(wallet));
    this.controllers.set("ether_withdraw", new WithdrawEther(wallet));
    this.controllers.set("ether_transfer", new TransferEther(wallet));
    this.controllers.set("erc721_withdraw", new WithdrawERC721Route(wallet));
    this.controllers.set("erc721_transfer", new TransferERC721Route(wallet));
    this.controllers.set("listassets", new GetListedAssetsRoute(wallet));
    this.controllers.set("list_asset", new ListAssetRoute(wallet));
    this.controllers.set("buy_asset", new BuyAssetsRoute(wallet));
  }
  set_rollup_address(rollup_address: string) {
    const controller = <WithdrawERC721Route>(
      this.controllers.get("erc721_withdraw")
    );
    controller.set_rollup_address(rollup_address);

    const controller2 = <WithdrawEther>this.controllers.get("ether_withdraw");
    controller2.set_rollup_address(rollup_address);
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

export { Router };

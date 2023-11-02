import { Voucher, Notice, Error_out, Output, Report } from "./outputs";
import { Balance } from "./balance";
import {
  encodeFunctionData,
  getAddress,
  Address,
  hexToBytes,
  parseEther,
} from "viem";
import { CartesiDappABI, erc721ABI } from "./rollups";
import { ethers } from "ethers";

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
  private _balance_get = (_account: Address): Balance => {
    let balance = Wallet.accounts.get(_account);
    if (balance === undefined || !balance) {
      Wallet.accounts.set(
        _account,
        new Balance(_account, BigInt(0), new Map())
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

  listAsset = (erc721: Address, token_id: number, amount: bigint) => {
    if (amount < 0) {
      throw new Error("invalid listing amount must be greater than 0");
    }
    Wallet.listedAssets.set(String(erc721 + "id:" + token_id), amount);
  };

  buyAsset = (
    account: Address,
    from: Address,
    erc721: Address,
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
}

export { Wallet };

import { Address } from "viem";

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
  ether_get(): bigint {
    return this.ether;
  }

  list_erc721(): Map<Address, Set<number>> {
    return this._erc721;
  }

  erc721_get(erc721: Address): Set<number> | undefined {
    return this._erc721.get(erc721);
  }

  ether_increase(amount: bigint): void {
    if (amount < 0) {
      throw new Error(
        `failed to increase balance of ether for ${this.account}`
      );
      return;
    }
    this.ether = this.ether + amount;
  }

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
}

export { Balance };

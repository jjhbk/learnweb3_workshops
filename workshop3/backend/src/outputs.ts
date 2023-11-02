import { stringToHex, bytesToHex, Address, ByteArray } from "viem";

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

class Voucher extends Output {
  destination: Address;
  constructor(_destination: Address, _payload: ByteArray) {
    let hexpayload = bytesToHex(_payload);
    super(hexpayload);
    this.type = "voucher";
    this.destination = _destination;
  }
}

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

export { Voucher, Notice, Log, Report, Error_out, Output };

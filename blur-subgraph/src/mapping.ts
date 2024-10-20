import {
  BigInt,
  Bytes,
  log,
  dataSource,
  json,
  JSONValue,
  JSONValueKind,
  DataSourceContext,
  DataSourceTemplate,
} from "@graphprotocol/graph-ts";
import * as assembly from "./pb/assembly";
import { Collection, Nft, User } from "../generated/schema";
import { TokenMeta } from "../generated/templates";

export class Transfer {
  public from: string;
  public to: string;
  public token_id: string;
  public collection: string;

  public constructor(from: string, to: string, token_id: string, collection: string) {
    this.from = from;
    this.to = to;
    this.token_id = token_id;
    this.collection = collection;
  }

  static fromProto(proto: assembly.google.protobuf.Struct | null): Transfer {
    if (proto == null) {
      throw new Error("Invalid transfer, not a struct");
    }
    let from = proto.fields.get("from");
    let to = proto.fields.get("to");
    let token_id = proto.fields.get("token_id");
    let collection: assembly.google.protobuf.Value | null = null;
    let tx_meta = proto.fields.get("tx_meta");
    if (tx_meta != null) {
      let struct = tx_meta.struct_value;
      if (struct != null) {
        let value = struct.fields.get("address");
        if (value != null) {
          collection = value;
        }
      }
    }

    if (from == null || to == null || token_id == null || collection == null) {
      throw new Error("Invalid transfer");
    }

    let transfer = new Transfer(
      from.string_value,
      to.string_value,
      token_id.string_value,
      collection.string_value
    );
    return transfer;
  }
}

export function doTransfers(transfer_list: assembly.google.protobuf.ListValue): void {
  for (let i = 0; i < transfer_list.values.length; i++) {
    let transfer = Transfer.fromProto(transfer_list.values[i].struct_value);

    let fromUser = User.load(transfer.from);
    if (fromUser == null) {
      fromUser = new User(transfer.from);
      fromUser.save();
    }

    let toUser = User.load(transfer.to);
    if (toUser == null) {
      toUser = new User(transfer.to);
      toUser.save();
    }

    let collection = Collection.load(transfer.collection);
    if (collection == null) {
      collection = new Collection(transfer.collection);
      collection.save();
    }

    let token = Nft.load(`${transfer.collection}-${transfer.token_id}`);
    if (token == null) {
      token = new Nft(`${transfer.collection}-${transfer.token_id}`);
      token.tokenId = BigInt.fromString(transfer.token_id);
      token.owner = transfer.to;
      token.collection = transfer.collection;
      token.save();
    }
  }
}

export function handleEvents(bytes: Uint8Array): void {
  let output = assembly.google.protobuf.Value.decode(bytes.buffer);
  let events = output.struct_value;
  if (events == null) {
    throw new Error("Invalid events, not a struct");
  }
  let transfers = events.fields.get("transfers");

  if (transfers) {
    let list = transfers.list_value;
    if (list && list.values.length > 0) {
      doTransfers(list);
    } else{
      log.debug("No transfers found in event", []);
    }
  }
}

// export function handleToken(bytes: Uint8Array): void {
//   let mints = assembly.contract.v1.Mints.decode(bytes.buffer);


//   if (entity == null) {
//     //TokenMetadataTemplate.create("ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486")
//     //TokenMetadataTemplate.create("ipfs://QmR25mZvQKQYbCZRP2ohAS3LgmQ76bpg1nqd8cEYYZMXhD")

//     DataSourceTemplate.create("TokenMetadata", [
//       "ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486",
//     ]);
//     let entity = new ExampleEntity("hello");
//     entity.save();
//   }

//   // if (mints.mints.length == 0) {
//   //   DataSourceTemplate.create("TokenMetadata", ["ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486"]);
//   //   return;
//   // } else {
//   //   // Loop through all mints
//   //   for (let i = 0; i < mints.mints.length; i++) {
//   //     let mint = mints.mints[i];
//   //     // let uri = mint.token_uri;
//   //     // const tokenipfsHash = uri.replace("ipfs://", "");
//   //     DataSourceTemplate.create("TokenMetadata", ["Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486"]);
//   //     let entity = new Token(mint.token_id.toString());
//   //     entity.id = mint.token_id.toString();
//   //     entity.tokenID = mint.token_id.toString();
//   //     entity.save();
//   //   }
//   // }
// }

export function handleTraits(content: Bytes): void {
  log.debug("GOT TO HANDLE TRAITS", []);
  const cid = dataSource.stringParam();
  log.info("content: {}", [content.toString()]);
  //let id = "content".toString();
  //let testEnt = Mutex.load("hello");
  // if (testEnt != null) {
  //   testEnt.content = "fdsfsdfsdfsdfd";

  //   testEnt.save();
  // }

  // //entity.traitType = content.toString();
  // //entity.value = content.toString();
  // entity.save();
  // const value = json.fromBytes(content).toObject();
  // if (value) {
  //   const tokenIdValue = value.get("tokenId");
  //   const attributes = value.get("attributes");
  //   if (
  //     attributes != null &&
  //     tokenIdValue != null
  //   ) {
  //     let tokenID = tokenIdValue.toString();
  //     // let token = Token.load(tokenID);
  //     // if (token == null) {
  //     //   token = new Token(tokenID);
  //     //   token.tokenID = tokenID;
  //     //   token.save();
  //     // }
  //     let attributesArray = attributes.toArray();
  //     for (let i = 0; i < attributesArray.length; i++) {
  //       let attribute = attributesArray[i].toObject();
  //       if (attribute != null) {
  //         let traitType = attribute.get("trait_type");
  //         let traitValue = attribute.get("value");
  //         if (traitType != null && traitValue != null) {
  //           let id = tokenID + "-" + i.toString();
  //           let entity = new Trait(id);
  //           entity.id = id;
  //           // entity.token = tokenID;
  //           entity.traitType = traitType.toString();
  //           entity.value = traitValue.toString();
  //           entity.save();
  //         }
  //       } else {
  //         log.info("atribute null\n\n\n\n\n\n", []);
  //       }
  //     }
  //   } else {
  //     log.info(
  //       "attributes or tokenid null or json not array type\n\n\n\n\n\n",
  //       []
  //     );
  //   }
  // } else {
  //   log.info("no content\n\n\n\n\n\n", []);
  // }
}

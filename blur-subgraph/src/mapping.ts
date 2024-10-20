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
  import { ExampleEntity } from "../generated/schema";
  import { TokenMetadata } from "../generated/templates";
  const POST_ID_KEY = "postID";
  
  export function handleToken(bytes: Uint8Array): void {
    let mints = assembly.contract.v1.Mints.decode(bytes.buffer);
  
    let entity = ExampleEntity.load("hello");
  
    if (entity == null) {
      //TokenMetadataTemplate.create("ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486")
      //TokenMetadataTemplate.create("ipfs://QmR25mZvQKQYbCZRP2ohAS3LgmQ76bpg1nqd8cEYYZMXhD")
  
      DataSourceTemplate.create("TokenMetadata", [
        "ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486",
      ]);
      let entity = new ExampleEntity("hello");
      entity.save();
    }
  
    // if (mints.mints.length == 0) {
    //   DataSourceTemplate.create("TokenMetadata", ["ipfs://Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486"]);
    //   return;
    // } else {
    //   // Loop through all mints
    //   for (let i = 0; i < mints.mints.length; i++) {
    //     let mint = mints.mints[i];
    //     // let uri = mint.token_uri;
    //     // const tokenipfsHash = uri.replace("ipfs://", "");
    //     DataSourceTemplate.create("TokenMetadata", ["Qma3sC19HbnWHqeLgcsQnR7Kvgus4oPQirXNH7QYBeACaq/1486"]);
    //     let entity = new Token(mint.token_id.toString());
    //     entity.id = mint.token_id.toString();
    //     entity.tokenID = mint.token_id.toString();
    //     entity.save();
    //   }
    // }
  }
  
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
  
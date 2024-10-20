namespace __proto {
  /**
   * Decoder implements protobuf message decode interface.
   *
   * Useful references:
   *
   * Protocol Buffer encoding: https://developers.google.com/protocol-buffers/docs/encoding
   * LEB128 encoding AKA varint 128 encoding: https://en.wikipedia.org/wiki/LEB128
   * ZigZag encoding/decoding (s32/s64): https://gist.github.com/mfuerstenau/ba870a29e16536fdbaba
   */
  export class Decoder {
    public view: DataView;
    public pos: i32;

    constructor(view: DataView) {
      this.view = view;
      this.pos = 0;
    }

    /**
     * Returns true if current reader has reached the buffer end
     * @returns True if current reader has reached the buffer end
     */
    @inline
    eof(): bool {
      return this.pos >= this.view.byteLength;
    }

    /**
     * Returns current buffer length in bytes
     * @returns Length in bytes
     */
    @inline
    get byteLength(): i32 {
      return this.view.byteLength;
    }

    /**
     * An alias method to fetch tag from the reader. Supposed to return tuple of [field number, wire_type].
     * TODO: Replace with return tuple when tuples become implemented in AS.
     * @returns Message tag value
     */
    @inline
    tag(): u32 {
      return this.uint32();
    }

    /**
     * Returns byte at offset, alias for getUint8
     * @param byteOffset Offset
     * @returns u8
     */
    @inline
    private u8at(byteOffset: i32): u8 {
      return this.view.getUint8(byteOffset);
    }

    /**
     * Reads and returns varint number (128 + 10 bits max) from a current position.
     * @returns Returns varint
     */
    varint(): u64 {
      let value: u64;

      // u32
      value = (u64(u8(this.u8at(this.pos))) & 127) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 7)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 14)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 21)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      // u32 remainder or u64 byte
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 28)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      // u64
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 35)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value =
        (value | ((u64(u8(this.u8at(this.pos))) & 127) << 42)) /* 42!!! */ >>>
        0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 49)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 28)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;
      // u64 remainder
      value = (value | ((u64(u8(this.u8at(this.pos))) & 127) << 35)) >>> 0;
      if (u8(this.u8at(this.pos++)) < 128) return value;

      if (this.pos > this.byteLength) {
        this.throwOutOfRange();
      }

      return value;
    }

    @inline
    int32(): i32 {
      return i32(this.varint());
    }

    @inline
    int64(): i64 {
      return i32(this.varint());
    }

    @inline
    uint32(): u32 {
      return u32(this.varint());
    }

    @inline
    uint64(): u64 {
      return u64(this.varint());
    }

    @inline
    sint32(): i32 {
      const n: u64 = this.varint();
      return i32((n >>> 1) ^ -(n & 1));
    }

    @inline
    sint64(): i64 {
      const n: u64 = this.varint();
      return i64((n >>> 1) ^ -(n & 1));
    }

    fixed32(): u32 {
      this.pos += 4;
      if (this.pos > this.byteLength) {
        this.throwOutOfRange();
      }

      // u32(u8) ensures that u8(-1) becomes u32(4294967295) instead of u8(255)
      return (
        u32(u8(this.u8at(this.pos - 4))) |
        (u32(u8(this.u8at(this.pos - 3))) << 8) |
        (u32(u8(this.u8at(this.pos - 2))) << 16) |
        (u32(u8(this.u8at(this.pos - 1))) << 24)
      );
    }

    @inline
    sfixed32(): i32 {
      return i32(this.fixed32());
    }

    fixed64(): u64 {
      this.pos += 8;
      if (this.pos > this.byteLength) {
        this.throwOutOfRange();
      }

      return (
        u64(u8(this.u8at(this.pos - 8))) |
        (u64(u8(this.u8at(this.pos - 7))) << 8) |
        (u64(u8(this.u8at(this.pos - 6))) << 16) |
        (u64(u8(this.u8at(this.pos - 5))) << 24) |
        (u64(u8(this.u8at(this.pos - 4))) << 32) |
        (u64(u8(this.u8at(this.pos - 3))) << 40) |
        (u64(u8(this.u8at(this.pos - 2))) << 48) |
        (u64(u8(this.u8at(this.pos - 1))) << 56)
      );
    }

    @inline
    sfixed64(): i64 {
      return i64(this.fixed64());
    }

    @inline
    float(): f32 {
      return f32.reinterpret_i32(this.fixed32());
    }

    @inline
    double(): f64 {
      return f64.reinterpret_i64(this.fixed64());
    }

    @inline
    bool(): boolean {
      return this.uint32() > 0;
    }

    /**
     * Reads and returns UTF8 string.
     * @returns String
     */
    string(): string {
      const length = this.uint32();
      if (this.pos + length > this.byteLength) {
        this.throwOutOfRange();
      }

      const p = this.pos + this.view.byteOffset;
      const value = String.UTF8.decode(this.view.buffer.slice(p, p + length));
      this.pos += length;
      return value;
    }

    /**
     * Reads and returns bytes array.
     * @returns Array<u8> of bytes
     */
    bytes(): Array<u8> {
      const len = this.uint32();
      if (this.pos + len > this.byteLength) {
        this.throwOutOfRange();
      }

      const a = new Array<u8>(len);
      for (let i: u32 = 0; i < len; i++) {
        a[i] = u8(this.u8at(this.pos++));
      }

      return a;
    }

    /**
     * Skips a message field if it can'be recognized by an object's decode() method
     * @param wireType Current wire type
     */
    skipType(wireType: u32): void {
      switch (wireType) {
        // int32, int64, uint32, uint64, sint32, sint64, bool, enum: varint, variable length
        case 0:
          this.varint(); // Just read a varint
          break;
        // fixed64, sfixed64, double: 8 bytes always
        case 1:
          this.skip(8);
          break;
        // length-delimited; length is determined by varint32; skip length bytes;
        case 2:
          this.skip(this.uint32());
          break;
        // tart group: skip till the end of the group, then skip group end marker
        case 3:
          while ((wireType = this.uint32() & 7) !== 4) {
            this.skipType(wireType);
          }
          break;
        // fixed32, sfixed32, float: 4 bytes always
        case 5:
          this.skip(4);
          break;

        // Something went beyond our capability to understand
        default:
          throw new Error(
            `Invalid wire type ${wireType} at offset ${this.pos}`
          );
      }
    }

    /**
     * Fast-forwards cursor by length with boundary check
     * @param length Byte length
     */
    skip(length: u32): void {
      if (this.pos + length > this.byteLength) {
        this.throwOutOfRange();
      }
      this.pos += length;
    }

    /**
     * OutOfRange check. Throws an exception if current position exceeds current buffer range
     */
    @inline
    private throwOutOfRange(): void {
      throw new Error(`Decoder position ${this.pos} is out of range!`);
    }
  }

  /**
   * Encoder implements protobuf message encode interface. This is the simplest not very effective version, which uses
   * Array<u8>.
   *
   * Useful references:
   *
   * Protocol Buffer encoding: https://developers.google.com/protocol-buffers/docs/encoding
   * LEB128 encoding AKA varint 128 encoding: https://en.wikipedia.org/wiki/LEB128
   * ZigZag encoding/decoding (s32/s64): https://gist.github.com/mfuerstenau/ba870a29e16536fdbaba
   */
  export class Encoder {
    public buf: Array<u8>;

    constructor(buf: Array<u8>) {
      this.buf = buf;
    }

    /**
     * Encodes varint at a current position
     * @returns Returns varint
     */
    varint64(value: u64): void {
      let v: u64 = value;

      while (v > 127) {
        this.buf.push(u8((v & 127) | 128));
        v = v >> 7;
      }

      this.buf.push(u8(v));
    }

    @inline
    int32(value: i32): void {
      this.varint64(value);
    }

    @inline
    int64(value: i64): void {
      this.varint64(value);
    }

    @inline
    uint32(value: u32): void {
      this.varint64(value);
    }

    @inline
    uint64(value: u64): void {
      this.varint64(value);
    }

    @inline
    sint32(value: i32): void {
      this.varint64((value << 1) ^ (value >> 31));
    }

    @inline
    sint64(value: i64): void {
      this.varint64((value << 1) ^ (value >> 63));
    }

    @inline
    fixed32(value: u32): void {
      this.buf.push(u8(value & 255));
      this.buf.push(u8((value >> 8) & 255));
      this.buf.push(u8((value >> 16) & 255));
      this.buf.push(u8(value >> 24));
    }

    @inline
    sfixed32(value: i32): void {
      this.fixed32(u32(value));
    }

    @inline
    fixed64(value: u64): void {
      this.buf.push(u8(value & 255));
      this.buf.push(u8((value >> 8) & 255));
      this.buf.push(u8((value >> 16) & 255));
      this.buf.push(u8((value >> 24) & 255));
      this.buf.push(u8((value >> 32) & 255));
      this.buf.push(u8((value >> 40) & 255));
      this.buf.push(u8((value >> 48) & 255));
      this.buf.push(u8(value >> 56));
    }

    @inline
    sfixed64(value: i64): void {
      this.fixed64(u64(value));
    }

    @inline
    float(value: f32): void {
      this.fixed32(u32(i32.reinterpret_f32(value)));
    }

    @inline
    double(value: f64): void {
      this.fixed64(u64(i64.reinterpret_f64(value)));
    }

    @inline
    bool(value: boolean): void {
      this.buf.push(value ? 1 : 0);
    }

    string(value: string): void {
      const utf8string = new DataView(String.UTF8.encode(value));

      for (let i = 0; i < utf8string.byteLength; i++) {
        this.buf.push(utf8string.getUint8(i));
      }
    }

    @inline
    bytes(value: Array<u8>): void {
      for (let i = 0; i < value.length; i++) {
        this.buf.push(value[i]);
      }
    }
  }

  /**
   * Returns byte size required to encode a value of a certain type
   */
  export class Sizer {
    static varint64(value: u64): u32 {
      return value < 128
        ? 1 // 2^7
        : value < 16384
        ? 2 // 2^14
        : value < 2097152
        ? 3 // 2^21
        : value < 268435456
        ? 4 // 2^28
        : value < 34359738368
        ? 5 // 2^35
        : value < 4398046511104
        ? 6 // 2^42
        : value < 562949953421312
        ? 7 // 2^49
        : value < 72057594037927936
        ? 8 // 2^56
        : value < 9223372036854775808
        ? 9 // 2^63
        : 10;
    }

    @inline
    static int32(value: i32): u32 {
      return Sizer.varint64(u64(value));
    }

    @inline
    static int64(value: i64): u32 {
      return Sizer.varint64(u64(value));
    }

    @inline
    static uint32(value: u32): u32 {
      return Sizer.varint64(value);
    }

    @inline
    static uint64(value: u64): u32 {
      return Sizer.varint64(value);
    }

    @inline
    static sint32(value: i32): u32 {
      return Sizer.varint64((value << 1) ^ (value >> 31));
    }

    @inline
    static sint64(value: i64): u32 {
      return Sizer.varint64((value << 1) ^ (value >> 63));
    }

    @inline
    static string(value: string): u32 {
      return value.length;
    }

    @inline
    static bytes(value: Array<u8>): u32 {
      return value.length;
    }
  }
}
export namespace google {
  export namespace protobuf {
    /**
     * `NullValue` is a singleton enumeration to represent the null value for the
     *  `Value` type union.
     *
     *  The JSON representation for `NullValue` is JSON `null`.
     */
    export enum NullValue {
      // Null value.
      NULL_VALUE = 0,
    } // NullValue
    /**
     * `Value` represents a dynamically typed value which can be either
     *  null, a number, a string, a boolean, a recursive struct value, or a
     *  list of values. A producer of value is expected to set one of these
     *  variants. Absence of any variant indicates an error.
     *
     *  The JSON representation for `Value` is JSON value.
     */
    export class Value {
      // Represents a null value.
      public null_value: u32;
      // Represents a double value.
      public number_value: f64;
      // Represents a string value.
      public string_value: string = "";
      // Represents a boolean value.
      public bool_value: bool;
      // Represents a structured value.
      public struct_value: Struct | null;
      // Represents a repeated `Value`.
      public list_value: ListValue | null;

      public __kind: string = "";
      public __kind_index: u8 = 0;

      static readonly KIND_NULL_VALUE_INDEX: u8 = 1;
      static readonly KIND_NUMBER_VALUE_INDEX: u8 = 2;
      static readonly KIND_STRING_VALUE_INDEX: u8 = 3;
      static readonly KIND_BOOL_VALUE_INDEX: u8 = 4;
      static readonly KIND_STRUCT_VALUE_INDEX: u8 = 5;
      static readonly KIND_LIST_VALUE_INDEX: u8 = 6;

      // Decodes Value from an ArrayBuffer
      static decode(buf: ArrayBuffer): Value {
        return Value.decodeDataView(new DataView(buf));
      }

      // Decodes Value from a DataView
      static decodeDataView(view: DataView): Value {
        const decoder = new __proto.Decoder(view);
        const obj = new Value();

        while (!decoder.eof()) {
          const tag = decoder.tag();
          const number = tag >>> 3;

          switch (number) {
            case 1: {
              obj.null_value = decoder.uint32();
              obj.__kind = "null_value";
              obj.__kind_index = 1;
              break;
            }
            case 2: {
              obj.number_value = decoder.double();
              obj.__kind = "number_value";
              obj.__kind_index = 2;
              break;
            }
            case 3: {
              obj.string_value = decoder.string();
              obj.__kind = "string_value";
              obj.__kind_index = 3;
              break;
            }
            case 4: {
              obj.bool_value = decoder.bool();
              obj.__kind = "bool_value";
              obj.__kind_index = 4;
              break;
            }
            case 5: {
              const length = decoder.uint32();
              obj.struct_value = Struct.decodeDataView(
                new DataView(
                  decoder.view.buffer,
                  decoder.pos + decoder.view.byteOffset,
                  length
                )
              );
              decoder.skip(length);

              obj.__kind = "struct_value";
              obj.__kind_index = 5;
              break;
            }
            case 6: {
              const length = decoder.uint32();
              obj.list_value = ListValue.decodeDataView(
                new DataView(
                  decoder.view.buffer,
                  decoder.pos + decoder.view.byteOffset,
                  length
                )
              );
              decoder.skip(length);

              obj.__kind = "list_value";
              obj.__kind_index = 6;
              break;
            }

            default:
              decoder.skipType(tag & 7);
              break;
          }
        }
        return obj;
      } // decode Value

      public size(): u32 {
        let size: u32 = 0;

        size +=
          this.null_value == 0 ? 0 : 1 + __proto.Sizer.uint32(this.null_value);
        size += this.number_value == 0 ? 0 : 1 + 8;
        size +=
          this.string_value.length > 0
            ? 1 +
              __proto.Sizer.varint64(this.string_value.length) +
              this.string_value.length
            : 0;
        size += this.bool_value == 0 ? 0 : 1 + 1;

        if (this.struct_value != null) {
          const f: Struct = this.struct_value as Struct;
          const messageSize = f.size();

          if (messageSize > 0) {
            size += 1 + __proto.Sizer.varint64(messageSize) + messageSize;
          }
        }

        if (this.list_value != null) {
          const f: ListValue = this.list_value as ListValue;
          const messageSize = f.size();

          if (messageSize > 0) {
            size += 1 + __proto.Sizer.varint64(messageSize) + messageSize;
          }
        }

        return size;
      }

      // Encodes Value to the ArrayBuffer
      encode(): ArrayBuffer {
        return changetype<ArrayBuffer>(
          StaticArray.fromArray<u8>(this.encodeU8Array())
        );
      }

      // Encodes Value to the Array<u8>
      encodeU8Array(
        encoder: __proto.Encoder = new __proto.Encoder(new Array<u8>())
      ): Array<u8> {
        const buf = encoder.buf;

        if (this.null_value != 0) {
          encoder.uint32(0x8);
          encoder.uint32(this.null_value);
        }
        if (this.number_value != 0) {
          encoder.uint32(0x11);
          encoder.double(this.number_value);
        }
        if (this.string_value.length > 0) {
          encoder.uint32(0x1a);
          encoder.uint32(this.string_value.length);
          encoder.string(this.string_value);
        }
        if (this.bool_value != 0) {
          encoder.uint32(0x20);
          encoder.bool(this.bool_value);
        }

        if (this.struct_value != null) {
          const f = this.struct_value as Struct;

          const messageSize = f.size();

          if (messageSize > 0) {
            encoder.uint32(0x2a);
            encoder.uint32(messageSize);
            f.encodeU8Array(encoder);
          }
        }

        if (this.list_value != null) {
          const f = this.list_value as ListValue;

          const messageSize = f.size();

          if (messageSize > 0) {
            encoder.uint32(0x32);
            encoder.uint32(messageSize);
            f.encodeU8Array(encoder);
          }
        }

        return buf;
      } // encode Value

      // Sets field value
      set<T>(value: T): Value {
        this.setNull();
        this.null_value = 0;

        if (isBoolean<T>(value)) {
          this.bool_value = value;
        } else if (isInteger<T>(value) || isFloat<T>(value)) {
          this.number_value = value;
        } else if (isString<T>(value)) {
          this.string_value = value;
        } else if (value instanceof Struct) {
          this.struct_value = value;
        } else if (value instanceof Value) {
          this.null_value = value.null_value;
          this.number_value = value.number_value;
          this.string_value = value.string_value;
          this.struct_value = value.struct_value;
          this.list_value = value.list_value;
        } else if (isArray(value)) {
          const v = new ListValue();
          for (let i: i32 = 0; i < value.length; i++) {
            v.values.push(new Value().set(value[i]));
          }
          this.list_value = v;
        }

        return this;
      }

      // Sets field value to null
      setNull(): void {
        this.null_value = 1;
        this.bool_value = false;
        this.string_value = "";
        this.struct_value = null;
        this.list_value = null;
      }
    } // Value

    /**
     * `Struct` represents a structured data value, consisting of fields
     *  which map to dynamically typed values. In some languages, `Struct`
     *  might be supported by a native representation. For example, in
     *  scripting languages like JS a struct is represented as an
     *  object. The details of that representation are described together
     *  with the proto support for the language.
     *
     *  The JSON representation for `Struct` is JSON object.
     */
    export class Struct {
      // Unordered map of dynamically typed values.
      public fields: Map<string, Value> = new Map<string, Value>();

      // Decodes Struct from an ArrayBuffer
      static decode(buf: ArrayBuffer): Struct {
        return Struct.decodeDataView(new DataView(buf));
      }

      // Decodes Struct from a DataView
      static decodeDataView(view: DataView): Struct {
        const decoder = new __proto.Decoder(view);
        const obj = new Struct();

        while (!decoder.eof()) {
          const tag = decoder.tag();
          const number = tag >>> 3;

          switch (number) {
            case 1: {
              const length = decoder.uint32();
              __decodeMap_string_Value(decoder, length, obj.fields);
              decoder.skip(length);

              break;
            }

            default:
              decoder.skipType(tag & 7);
              break;
          }
        }
        return obj;
      } // decode Struct

      public size(): u32 {
        let size: u32 = 0;

        if (this.fields.size > 0) {
          const keys = this.fields.keys();

          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = this.fields.get(key);
            const itemSize = __sizeMapEntry_string_Value(key, value);
            if (itemSize > 0) {
              size += 1 + __proto.Sizer.varint64(itemSize) + itemSize;
            }
          }
        }

        return size;
      }

      // Encodes Struct to the ArrayBuffer
      encode(): ArrayBuffer {
        return changetype<ArrayBuffer>(
          StaticArray.fromArray<u8>(this.encodeU8Array())
        );
      }

      // Encodes Struct to the Array<u8>
      encodeU8Array(
        encoder: __proto.Encoder = new __proto.Encoder(new Array<u8>())
      ): Array<u8> {
        const buf = encoder.buf;

        if (this.fields.size > 0) {
          const keys = this.fields.keys();
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = this.fields.get(key);
            const size = __sizeMapEntry_string_Value(key, value);
            if (size > 0) {
              encoder.uint32(0xa);
              encoder.uint32(size);
              if (key.length > 0) {
                encoder.uint32(0xa);
                encoder.uint32(key.length);
                encoder.string(key);
              }

              const messageSize = value.size();

              if (messageSize > 0) {
                encoder.uint32(0x12);
                encoder.uint32(messageSize);
                value.encodeU8Array(encoder);
              }
            }
          }
        }

        return buf;
      } // encode Struct

      // Returns struct field by name. If field does not exists, it gets created and added to the fields collection.
      get(name: string): Value {
        if (this.fields.has(name)) {
          return this.fields.get(name);
        }

        const v = new Value();
        v.setNull();
        this.fields.set(name, v);
        return v;
      }
    } // Struct

    /**
     * `ListValue` is a wrapper around a repeated field of values.
     *
     *  The JSON representation for `ListValue` is JSON array.
     */
    export class ListValue {
      // Repeated field of dynamically typed values.
      public values: Array<Value> = new Array<Value>();

      // Decodes ListValue from an ArrayBuffer
      static decode(buf: ArrayBuffer): ListValue {
        return ListValue.decodeDataView(new DataView(buf));
      }

      // Decodes ListValue from a DataView
      static decodeDataView(view: DataView): ListValue {
        const decoder = new __proto.Decoder(view);
        const obj = new ListValue();

        while (!decoder.eof()) {
          const tag = decoder.tag();
          const number = tag >>> 3;

          switch (number) {
            case 1: {
              const length = decoder.uint32();
              obj.values.push(
                Value.decodeDataView(
                  new DataView(
                    decoder.view.buffer,
                    decoder.pos + decoder.view.byteOffset,
                    length
                  )
                )
              );
              decoder.skip(length);

              break;
            }

            default:
              decoder.skipType(tag & 7);
              break;
          }
        }
        return obj;
      } // decode ListValue

      public size(): u32 {
        let size: u32 = 0;

        for (let n: i32 = 0; n < this.values.length; n++) {
          const messageSize = this.values[n].size();

          if (messageSize > 0) {
            size += 1 + __proto.Sizer.varint64(messageSize) + messageSize;
          }
        }

        return size;
      }

      // Encodes ListValue to the ArrayBuffer
      encode(): ArrayBuffer {
        return changetype<ArrayBuffer>(
          StaticArray.fromArray<u8>(this.encodeU8Array())
        );
      }

      // Encodes ListValue to the Array<u8>
      encodeU8Array(
        encoder: __proto.Encoder = new __proto.Encoder(new Array<u8>())
      ): Array<u8> {
        const buf = encoder.buf;

        for (let n: i32 = 0; n < this.values.length; n++) {
          const messageSize = this.values[n].size();

          if (messageSize > 0) {
            encoder.uint32(0xa);
            encoder.uint32(messageSize);
            this.values[n].encodeU8Array(encoder);
          }
        }

        return buf;
      } // encode ListValue
    } // ListValue
  } // protobuf
} // google
export namespace contract {
  export namespace v1 {
    export class Mint {
      public token_id: string = "";
      public token_uri: string = "";

      // Decodes Mint from an ArrayBuffer
      static decode(buf: ArrayBuffer): Mint {
        return Mint.decodeDataView(new DataView(buf));
      }

      // Decodes Mint from a DataView
      static decodeDataView(view: DataView): Mint {
        const decoder = new __proto.Decoder(view);
        const obj = new Mint();

        while (!decoder.eof()) {
          const tag = decoder.tag();
          const number = tag >>> 3;

          switch (number) {
            case 1: {
              obj.token_id = decoder.string();
              break;
            }
            case 2: {
              obj.token_uri = decoder.string();
              break;
            }

            default:
              decoder.skipType(tag & 7);
              break;
          }
        }
        return obj;
      } // decode Mint

      public size(): u32 {
        let size: u32 = 0;

        size +=
          this.token_id.length > 0
            ? 1 +
              __proto.Sizer.varint64(this.token_id.length) +
              this.token_id.length
            : 0;
        size +=
          this.token_uri.length > 0
            ? 1 +
              __proto.Sizer.varint64(this.token_uri.length) +
              this.token_uri.length
            : 0;

        return size;
      }

      // Encodes Mint to the ArrayBuffer
      encode(): ArrayBuffer {
        return changetype<ArrayBuffer>(
          StaticArray.fromArray<u8>(this.encodeU8Array())
        );
      }

      // Encodes Mint to the Array<u8>
      encodeU8Array(
        encoder: __proto.Encoder = new __proto.Encoder(new Array<u8>())
      ): Array<u8> {
        const buf = encoder.buf;

        if (this.token_id.length > 0) {
          encoder.uint32(0xa);
          encoder.uint32(this.token_id.length);
          encoder.string(this.token_id);
        }
        if (this.token_uri.length > 0) {
          encoder.uint32(0x12);
          encoder.uint32(this.token_uri.length);
          encoder.string(this.token_uri);
        }

        return buf;
      } // encode Mint
    } // Mint

    export class Mints {
      public mints: Array<Mint> = new Array<Mint>();

      // Decodes Mints from an ArrayBuffer
      static decode(buf: ArrayBuffer): Mints {
        return Mints.decodeDataView(new DataView(buf));
      }

      // Decodes Mints from a DataView
      static decodeDataView(view: DataView): Mints {
        const decoder = new __proto.Decoder(view);
        const obj = new Mints();

        while (!decoder.eof()) {
          const tag = decoder.tag();
          const number = tag >>> 3;

          switch (number) {
            case 1: {
              const length = decoder.uint32();
              obj.mints.push(
                Mint.decodeDataView(
                  new DataView(
                    decoder.view.buffer,
                    decoder.pos + decoder.view.byteOffset,
                    length
                  )
                )
              );
              decoder.skip(length);

              break;
            }

            default:
              decoder.skipType(tag & 7);
              break;
          }
        }
        return obj;
      } // decode Mints

      public size(): u32 {
        let size: u32 = 0;

        for (let n: i32 = 0; n < this.mints.length; n++) {
          const messageSize = this.mints[n].size();

          if (messageSize > 0) {
            size += 1 + __proto.Sizer.varint64(messageSize) + messageSize;
          }
        }

        return size;
      }

      // Encodes Mints to the ArrayBuffer
      encode(): ArrayBuffer {
        return changetype<ArrayBuffer>(
          StaticArray.fromArray<u8>(this.encodeU8Array())
        );
      }

      // Encodes Mints to the Array<u8>
      encodeU8Array(
        encoder: __proto.Encoder = new __proto.Encoder(new Array<u8>())
      ): Array<u8> {
        const buf = encoder.buf;

        for (let n: i32 = 0; n < this.mints.length; n++) {
          const messageSize = this.mints[n].size();

          if (messageSize > 0) {
            encoder.uint32(0xa);
            encoder.uint32(messageSize);
            this.mints[n].encodeU8Array(encoder);
          }
        }

        return buf;
      } // encode Mints
    } // Mints
  } // v1
} // contract

// __decodeMap_string_Value

function __decodeMap_string_Value(
  parentDecoder: __proto.Decoder,
  length: i32,
  map: Map<string, google.protobuf.Value>
): void {
  const decoder = new __proto.Decoder(
    new DataView(
      parentDecoder.view.buffer,
      parentDecoder.pos + parentDecoder.view.byteOffset,
      length
    )
  );

  let key: string = "";
  let value: google.protobuf.Value = new google.protobuf.Value();

  while (!decoder.eof()) {
    const tag = decoder.tag();
    const number = tag >>> 3;

    switch (number) {
      case 1: {
        key = decoder.string();
        break;
      }

      case 2: {
        const length = decoder.uint32();
        value = google.protobuf.Value.decodeDataView(
          new DataView(
            decoder.view.buffer,
            decoder.pos + decoder.view.byteOffset,
            length
          )
        );
        decoder.skip(length);

        break;
      }

      default:
        decoder.skipType(tag & 7);
        break;
    }
  }
  map.set(key as string, value as google.protobuf.Value);
}

// __sizeMapEntry_string_Value

function __sizeMapEntry_string_Value(key: string, value: google.protobuf.Value): u32 {
  const keySize =
    key.length > 0 ? 1 + __proto.Sizer.varint64(key.length) + key.length : 0;
  const valueSize = value.size();

  if (valueSize == 0) {
    return keySize;
  }

  return keySize + 1 + __proto.Sizer.varint64(valueSize) + valueSize;
}

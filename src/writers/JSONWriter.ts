import {
  JSONWriterOptions, ObjectWriterOptions, XMLSerializedAsObject, 
  XMLSerializedAsObjectArray, XMLBuilderOptions
} from "../interfaces"
import { ObjectWriter } from "./ObjectWriter"
import {
  applyDefaults, isArray, isObject, objectLength, forEachObject,
  forEachArray
} from "@oozcitak/util"
import { Node } from "@oozcitak/dom/lib/dom/interfaces"
import { BaseWriter } from "./BaseWriter"

/**
 * Serializes XML nodes into a JSON string.
 */
export class JSONWriter extends BaseWriter<JSONWriterOptions, string> {

  /**
   * Initializes a new instance of `JSONWriter`.
   * 
   * @param builderOptions - XML builder options
   * @param writerOptions - serialization options
   */
  constructor(builderOptions: XMLBuilderOptions, writerOptions: JSONWriterOptions) {
    super(builderOptions)
    // provide default options
    this._writerOptions = applyDefaults(writerOptions, {
      wellFormed: false,
      noDoubleEncoding: false,
      prettyPrint: false,
      indent: '  ',
      newline: '\n',
      offset: 0,
      group: false,
      verbose: false
    }) as Required<JSONWriterOptions>
  }

  /**
   * Produces an XML serialization of the given node.
   * 
   * @param node - node to serialize
   * @param writerOptions - serialization options
   */
  serialize(node: Node): string {
    // convert to object
    const objectWriterOptions: ObjectWriterOptions = applyDefaults(this._writerOptions, {
      format: "object",
      wellFormed: false,
      noDoubleEncoding: false,
    })
    const objectWriter = new ObjectWriter(this._builderOptions, objectWriterOptions)
    const val = objectWriter.serialize(node)

    // recursively convert object into JSON string
    return this._beginLine(this._writerOptions, 0) + this._convertObject(val, this._writerOptions)
  }

  /**
   * Produces an XML serialization of the given object.
   * 
   * @param obj - object to serialize
   * @param options - serialization options
   * @param level - depth of the XML tree
   */
  private _convertObject(obj: string | XMLSerializedAsObject | XMLSerializedAsObjectArray,
    options: Required<JSONWriterOptions>, level: number = 0): string {

    let markup = ''
    const isLeaf = this._isLeafNode(obj)

    if (isArray(obj)) {
      markup += '['
      const len = obj.length
      let i = 0
      for (const val of obj) {
        markup += this._endLine(options, level + 1) +
          this._beginLine(options, level + 1) +
          this._convertObject(val, options, level + 1)
        if (i < len - 1) { markup += ',' }
        i++
      }
      markup += this._endLine(options, level) + this._beginLine(options, level)
      markup += ']'
    } else if (isObject(obj)) {
      markup += '{'
      const len = objectLength(obj)
      let i = 0
      forEachObject(obj, (key, val) => {
        if (isLeaf && options.prettyPrint) {
          markup += ' '
        } else {
          markup += this._endLine(options, level + 1) + this._beginLine(options, level + 1)
        }
        markup += this._key(key)
        if (options.prettyPrint) { markup += ' ' }
        markup += this._convertObject(val, options, level + 1)
        if (i < len - 1) { markup += ',' }
        i++
      }, this)
      if (isLeaf && options.prettyPrint) {
        markup += ' '
      } else {
        markup += this._endLine(options, level) + this._beginLine(options, level)
      }
      markup += '}'
    } else {
      markup += this._val(obj)
    }
    return markup
  }


  /**
   * Produces characters to be prepended to a line of string in pretty-print
   * mode.
   * 
   * @param options - serialization options
   * @param level - current depth of the XML tree
   */
  private _beginLine(options: Required<JSONWriterOptions>, level: number): string {
    if (!options.prettyPrint) {
      return ''
    } else {
      const indentLevel = options.offset + level + 1
      if (indentLevel > 0) {
        return new Array(indentLevel).join(options.indent)
      }
    }

    return ''
  }

  /**
   * Produces characters to be appended to a line of string in pretty-print
   * mode.
   * 
   * @param options - serialization options
   * @param level - current depth of the XML tree
   */
  private _endLine(options: Required<JSONWriterOptions>, level: number): string {
    if (!options.prettyPrint) {
      return ''
    } else {
      return options.newline
    }
  }

  /**
   * Produces a JSON key string delimited with double quotes.
   */
  private _key(key: string): string {
    return "\"" + key + "\":"
  }

  /**
   * Produces a JSON value string delimited with double quotes.
   */
  private _val(val: string): string {
    return JSON.stringify(val)
  }

  /**
   * Determines if an object is a leaf node.
   * 
   * @param obj 
   */
  private _isLeafNode(obj: any): boolean {
    return this._descendantCount(obj) <= 1
  }

  /**
   * Counts the number of descendants of the given object.
   * 
   * @param obj 
   * @param count 
   */
  private _descendantCount(obj: any, count: number = 0): number {
    if (isArray(obj)) {
      forEachArray(obj, val => count += this._descendantCount(val, count), this)
    } else if (isObject(obj)) {
      forEachObject(obj, (key, val) => count += this._descendantCount(val, count), this)
    } else {
      count++
    }
    return count
  }
}
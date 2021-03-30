import { XMLWriterOptions, XMLBuilderOptions } from "../interfaces"
import { applyDefaults } from "@oozcitak/util"
import { Node, NodeType } from "@oozcitak/dom/lib/dom/interfaces"
import { BaseWriter } from "./BaseWriter"
import { Guard } from "@oozcitak/dom/lib/util"

/**
 * Serializes XML nodes into strings.
 */
export class XMLWriter extends BaseWriter<XMLWriterOptions, string> {

  private _refs!: StringWriterRefs
  private _indentation: { [key: number]: string } = {}
  private _lengthToLastNewline = 0

  /**
   * Initializes a new instance of `XMLWriter`.
   * 
   * @param builderOptions - XML builder options
   * @param writerOptions - serialization options
   */
  constructor(builderOptions: XMLBuilderOptions, writerOptions: XMLWriterOptions) {
    super(builderOptions)
    // provide default options
    this._writerOptions = applyDefaults(writerOptions, {
      wellFormed: false,
      noDoubleEncoding: false,
      headless: false,
      prettyPrint: false,
      indent: "  ",
      newline: "\n",
      offset: 0,
      width: 0,
      allowEmptyTags: false,
      indentTextOnlyNodes: false,
      spaceBeforeSlash: false
    }) as Required<XMLWriterOptions>
  }
  
  /**
   * Produces an XML serialization of the given node.
   * 
   * @param node - node to serialize
   */
  serialize(node: Node): string {
    this._refs = { suppressPretty: false, emptyNode: false, markup: "" }

    // Serialize XML declaration
    if (node.nodeType === NodeType.Document && !this._writerOptions.headless) {
      this.declaration(this._builderOptions.version, this._builderOptions.encoding,
        this._builderOptions.standalone)
    }

    // recursively serialize node
    this.serializeNode(node, this._writerOptions.wellFormed, this._writerOptions.noDoubleEncoding)

    // remove trailing newline
    if (this._writerOptions.prettyPrint &&
      this._refs.markup.slice(-this._writerOptions.newline.length) === this._writerOptions.newline) {
      this._refs.markup = this._refs.markup.slice(0, -this._writerOptions.newline.length)
    }

    return this._refs.markup
  }

  /** @inheritdoc */
  declaration(version: "1.0", encoding?: string, standalone?: boolean): void {
    this._beginLine()

    this._refs.markup += "<?xml version=\"" + version + "\""
    if (encoding !== undefined) {
      this._refs.markup += " encoding=\"" + encoding + "\""
    }
    if (standalone !== undefined) {
      this._refs.markup += " standalone=\"" + (standalone ? "yes" : "no") + "\""
    }
    this._refs.markup += "?>"

    this._endLine()
  }

  /** @inheritdoc */
  docType(name: string, publicId: string, systemId: string): void {
    this._beginLine()

    if (publicId && systemId) {
      this._refs.markup += "<!DOCTYPE " + name + " PUBLIC \"" + publicId + "\" \"" + systemId + "\">"
    } else if (publicId) {
      this._refs.markup += "<!DOCTYPE " + name + " PUBLIC \"" + publicId + "\">"
    } else if (systemId) {
      this._refs.markup += "<!DOCTYPE " + name + " SYSTEM \"" + systemId + "\">"
    } else {
      this._refs.markup += "<!DOCTYPE " + name + ">"
    }

    this._endLine()
  }

  /** @inheritdoc */
  openTagBegin(name: string): void {
    this._beginLine()
    this._refs.markup += "<" + name
  }

  /** @inheritdoc */
  openTagEnd(name: string, selfClosing: boolean, voidElement: boolean): void {
    // do not indent text only elements or elements with empty text nodes
    this._refs.suppressPretty = false
    this._refs.emptyNode = false
    if (this._writerOptions.prettyPrint && !selfClosing && !voidElement) {
      let textOnlyNode = true
      let emptyNode = true
      let childNode = this.currentNode.firstChild
      let cdataCount = 0
      let textCount = 0
      while (childNode) {
        if (Guard.isExclusiveTextNode(childNode)) {
          textCount++
        } else if (Guard.isCDATASectionNode(childNode)) {
          cdataCount++
        } else {
          textOnlyNode = false
          emptyNode = false
          break
        }

        if (childNode.data !== '') {
          emptyNode = false
        }

        childNode = childNode.nextSibling
      }
      this._refs.suppressPretty = !this._writerOptions.indentTextOnlyNodes && textOnlyNode && ((cdataCount <= 1 && textCount === 0) || cdataCount === 0)
      this._refs.emptyNode = emptyNode
    }

    if ((voidElement || selfClosing || this._refs.emptyNode) && this._writerOptions.allowEmptyTags) {
      this._refs.markup += "></" + name + ">"
    } else {
      this._refs.markup += voidElement ? " />" :
        (selfClosing || this._refs.emptyNode) ? (this._writerOptions.spaceBeforeSlash ? " />" : "/>") : ">"
    }
    this._endLine()
  }

  /** @inheritdoc */
  closeTag(name: string): void {
    if (!this._refs.emptyNode) {
      this._beginLine()
      this._refs.markup += "</" + name + ">"
    }

    this._refs.suppressPretty = false
    this._refs.emptyNode = false

    this._endLine()
  }

  /** @inheritdoc */
  attribute(name: string, value: string): void {
    const str = name + "=\"" + value + "\""
    if (this._writerOptions.prettyPrint && this._writerOptions.width > 0 &&
      this._refs.markup.length - this._lengthToLastNewline + 1 + str.length > this._writerOptions.width) {
      this._endLine()
      this._beginLine()
      this._refs.markup += this._indent(1) + str
    } else {
      this._refs.markup += " " + str
    }
  }

  /** @inheritdoc */
  text(data: string): void {
    if (data !== '') {
      this._beginLine()
      this._refs.markup += data
      this._endLine()
    }
  }

  /** @inheritdoc */
  cdata(data: string): void {
    if (data !== '') {
      this._beginLine()
      this._refs.markup += "<![CDATA[" + data + "]]>"
      this._endLine()
    }
  }

  /** @inheritdoc */
  comment(data: string): void {
    this._beginLine()
    this._refs.markup += "<!--" + data + "-->"
    this._endLine()
  }

  /** @inheritdoc */
  instruction(target: string, data: string): void {
    this._beginLine()
    this._refs.markup += "<?" + (data === "" ? target : target + " " + data) + "?>"
    this._endLine()
  }

  /**
   * Produces characters to be prepended to a line of string in pretty-print
   * mode.
   */
  private _beginLine(): void {
    if (this._writerOptions.prettyPrint && !this._refs.suppressPretty) {
      this._refs.markup += this._indent(this._writerOptions.offset + this.level)
    }
  }

  /**
   * Produces characters to be appended to a line of string in pretty-print
   * mode.
   */
  private _endLine(): void {
    if (this._writerOptions.prettyPrint && !this._refs.suppressPretty) {
      this._refs.markup += this._writerOptions.newline
      this._lengthToLastNewline = this._refs.markup.length
    }
  }

  /**
   * Produces an indentation string.
   * 
   * @param level - depth of the tree
   */
  private _indent(level: number): string {
    if (level <= 0) {
      return ""
    } else if (this._indentation[level] !== undefined) {
      return this._indentation[level]
    } else {
      const str = this._writerOptions.indent.repeat(level)
      this._indentation[level] = str
      return str
    }
  }

}

/**
 * Represents reference parameters passed to string writer functions.
 */
type StringWriterRefs = {
  /**
   * Suppresses pretty-printing
   */
  suppressPretty: boolean
  /**
   * The text child nodes of the current element node has no data.
   */
  emptyNode: boolean
  /**
   * The string representing the serialized document.
   */
  markup: string
}
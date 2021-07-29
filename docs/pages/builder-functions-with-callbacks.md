---
title: "Builder Functions with Callbacks"
keywords: builder documentCB fragmentCB callback function api
sidebar: api_sidebar
permalink: builder-functions-with-callbacks.html
toc: false
comments: false
---

Following functions exported by `xmlbuilder2` are imported with:
```js
const { createCB, fragmentCB } = require('xmlbuilder2');
```
These functions can be used to create an XML document in chunks, without keeping the 
entire document tree in memory, so that large documents can be created without exhausting
available memory.

{% capture cb_tip %}
  `createCB` and `fragmentCB` functions return a callback document builder object (an instance of the class [`XMLBuilderCB`](https://github.com/oozcitak/xmlbuilder2/blob/master/src/callback/XMLBuilderCBImpl.ts)) which is a different object from the builder object returned by `create` (an instance of the class [`XMLBuilder`](https://github.com/oozcitak/xmlbuilder2/blob/master/src/builder/XMLBuilderImpl.ts)). Although `XMLBuilderCB` methods have similar method signatures, they are not XML node wrappers but the same  object instance whose state is altered with each call. Use these functions if you need to create an XML document in chunks and you are only interested in the final XML document string. If you need to process intermediate nodes, use the [`create`]({{ site.baseurl }}{% link pages/builder-functions.md %}#create) function.
{% endcapture %}
{% include warning.html content=cb_tip %}

### createCB

The `createCB` function serializes an XML document in chunks with the provided callback functions.

<details markdown="1">
<summary><code><strong>createCB</strong>(<code>options</code>: object)</code></summary>
<br/>

* `options` - builder options and callback functions

```js
const { createCB } = require('xmlbuilder2');
const { createWriteStream } = require('fs');

const filename = 'path/to/output/file';
const outFile = createWriteStream(filename);

const xmlBuilder = createCB({
  'data': (chunk) => outFile.write(chunk),
  'end': () => outFile.end(),
  prettyPrint: true
});

xmlBuilder.ele('root')
  .ele('foo').up()
  .ele('bar').att('fizz', 'buzz').up()
  .end();
```
```xml
<root>
  <foo/>
  <bar fizz="buzz"/>
</root>
```

The callback document builder is a proper node.js [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter), so the following approach is also possible:

```js
const { createCB } = require('xmlbuilder2');
const { createWriteStream } = require('fs');

const filename = 'path/to/output/file';
const outFile = createWriteStream(filename);

const xmlBuilder = createCB({ prettyPrint: true });
xmlBuilder.on('data', (chunk) => outFile.write(chunk));
xmlBuilder.on('end', () => outFile.end());

xmlBuilder.ele('root')
  .ele('foo').up()
  .ele('bar').att('fizz', 'buzz').up()
  .end();
```

</details>

___

### fragmentCB

The `fragmentCB` function serializes an XML document fragment in chunks with the provided callback functions.

<details markdown="1">
<summary><code><strong>fragmentCB</strong>(<code>options</code>: object)</code></summary>
<br/>

* `options` - builder options and callback functions

```js
const { fragmentCB } = require('xmlbuilder2');
const { createWriteStream } = require('fs');

const filename = 'path/to/output/file';
const outFile = createWriteStream(filename);

const xmlBuilder = fragmentCB({
  'data': (chunk) => outFile.write(chunk),
  'end': () => outFile.end(),
  prettyPrint: true
});

xmlBuilder.ele('foo').up()
  .ele('foo').att('fizz', 'buzz').up()
  .ele('foo').up()
  .end();
```
```xml
<foo/>
<foo fizz="buzz"/>
<foo/>
```

</details>

___

### Builder options

#### Callback functions

* `data` - a callback function which is called when a chunk of XML is
serialized. The function will receive the string chunk as its first
argument and the depth of the XML tree as its second argument.
* `end` - a callback function which is called when XML serialization is completed.
* `error` - a callback function which is called when an error occurs.
The function will receive the error object as its argument.

#### Settings related to value conversions

* `keepNullNodes` - Whether nodes with `null` and `undefined` values will be kept or ignored: `true` or `false`. Defaults to `false`, which silently ignores nodes with `null` and `undefined` values. When set to `true`, `null` will be treated as an empty string.
* `keepNullAttributes` - Whether attributes with `null` and `undefined` values will be kept or ignored: `true` or `false`. Defaults to `false`, which silently ignores attributes with `null` and `undefined` values. When set to `true`, `null` will be treated as an empty string.
* `ignoreConverters` - Whether converter strings will be ignored when converting JS objects: `true` or `false`. Defaults to `false`.
* `convert` - An object defining converter strings. Default converter strings are described below.
  * `att` -  When prepended to a JS object key, converts its key-value pair to an attribute. Defaults to `'@'`.
  * `ins` - When prepended to a JS object key, converts its value to a processing instruction node. Defaults to `'?'`.
  * `text` - when prepended to a JS object key, converts its value to a text node. Defaults to `'#'`.
  * `cdata` - when prepended to a JS object key, converts its value to a CDATA section node. Defaults to `'$'`.
  * `comment` - When prepended to a JS object key, converts its value to a comment node. Defaults to `'!'`.

#### Settings related to XML namespaces

* `defaultNamespace` - Contains default namespaces to apply to all elements and attributes (see: [example]({{ site.baseurl }}{% link pages/namespaces.md %}#namespace-defaults))
  * `ele` - default namespace for element nodes
  * `att` - default namespace for attributes
* `namespaceAlias` - Contains namespace aliases where object keys are namespace aliases and object values are namespaces (see: [example]({{ site.baseurl }}{% link pages/namespaces.md %}#namespace-aliases))

#### Serialization settings

* `format` - Output format. Either `'xml'`, `'json'` or `'yaml'`.
* `wellFormed` - Ensures that the document adheres to the syntax rules specified by the XML specification. If this flag is set and the document is not well-formed errors will be thrown. Defaults to `false`.
* `prettyPrint` - Pretty-prints the XML tree. Defaults to `false`.
* `indent` - Determines the indentation string for pretty printing. Defaults to two space characters.
* `newline` - Determines the newline string for pretty printing. Defaults to `'\n'`.
* `offset` - Defines a fixed number of indentations to add to every line. Defaults to `0`.
* `width` - Determines the maximum column width. Defaults to `0`.
* `allowEmptyTags` - Produces closing tags for empty element nodes. With this option set to `true`, closing tags will be produced for element nodes without child nodes, e.g. `<node></node>`. Otherwise, empty element nodes will be self-closed, e.g. `<node/>`. Defaults to `false`.
* `spaceBeforeSlash` - Inserts a space character before the slash character of self-closing tags. With this options set to `true`, a space character will be inserted before the slash character of self-closing tags, e.g. `<node />`. Defaults to `false`.


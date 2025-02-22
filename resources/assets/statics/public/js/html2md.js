(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.toMarkdown = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    /*
     * to-markdown - https://github.com/LCTT/LCTT-Helper/blob/master/js/to-markdown.js
     *
     * Copyright 2011+, Dom Christie
     * Licenced under the MIT licence
     *
     */

    'use strict'

    var toMarkdown
    var converters
    var mdConverters = require('./lib/md-converters')
    var gfmConverters = require('./lib/gfm-converters')
    var HtmlParser = require('./lib/html-parser')
    var collapse = require('collapse-whitespace')

    /*
     * Utilities
     */

    var blocks = ['address', 'article', 'aside', 'audio', 'blockquote', 'body',
      'canvas', 'center', 'dd', 'dir', 'div', 'dl', 'dt', 'fieldset', 'figcaption',
      'figure', 'footer', 'form', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7',
      'header', 'hgroup', 'hr', 'html', 'isindex', 'li', 'main', 'menu', 'nav',
      'noframes', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table',
      'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
    ]

    function isBlock (node) {
      return blocks.indexOf(node.nodeName.toLowerCase()) !== -1
    }

    var voids = [
      'area', 'base', 'br', 'col', 'command', 'embed', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr'
    ]

    function isVoid (node) {
      return voids.indexOf(node.nodeName.toLowerCase()) !== -1
    }

    function htmlToDom (string) {
      var tree = new HtmlParser().parseFromString(string, 'text/html')
      collapse(tree.documentElement, isBlock)
      return tree
    }

    /*
     * Flattens DOM tree into single array
     */

    function bfsOrder (node) {
      var inqueue = [node]
      var outqueue = []
      var elem
      var children
      var i

      while (inqueue.length > 0) {
        elem = inqueue.shift()
        outqueue.push(elem)
        children = elem.childNodes
        for (i = children.length - 1; i >= 0; i--) {
          if (children[i].nodeType === 1) inqueue.push(children[i])
        }
      }
      outqueue.shift()
      return outqueue
    }

    /*
     * Contructs a Markdown string of replacement text for a given node
     */

    function getContent (node) {
      var text = ''
      for (var i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1) {
          text += node.childNodes[i]._replacement
        } else if (node.childNodes[i].nodeType === 3) {
          text += node.childNodes[i].data
        } else continue
      }
      return text
    }

    /*
     * Returns the HTML string of an element with its contents converted
     */

    function outer (node, content) {
      return node.cloneNode(false).outerHTML.replace('><', '>' + content + '<')
    }

    function canConvert (node, filter) {
      if (typeof filter === 'string') {
        return filter === node.nodeName.toLowerCase()
      }
      if (Array.isArray(filter)) {
        return filter.indexOf(node.nodeName.toLowerCase()) !== -1
      } else if (typeof filter === 'function') {
        return filter.call(toMarkdown, node)
      } else {
        throw new TypeError('`filter` needs to be a string, array, or function')
      }
    }

    function isFlankedByWhitespace (side, node) {
      var sibling
      var regExp
      var isFlanked

      if (side === 'left') {
        sibling = node.previousSibling
        regExp = / $/
      } else {
        sibling = node.nextSibling
        regExp = /^ /
      }

      if (sibling) {
        if (sibling.nodeType === 3) {
          isFlanked = regExp.test(sibling.nodeValue)
        } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
          isFlanked = regExp.test(sibling.textContent)
        }
      }
      return isFlanked
    }

    function flankingWhitespace (node, content) {
      var leading = ''
      var trailing = ''

      if (!isBlock(node)) {
        var hasLeading = /^[ \r\n\t]/.test(content)
        var hasTrailing = /[ \r\n\t]$/.test(content)

        if (hasLeading && !isFlankedByWhitespace('left', node)) {
          leading = ' '
        }
        if (hasTrailing && !isFlankedByWhitespace('right', node)) {
          trailing = ' '
        }
      }

      return { leading: leading, trailing: trailing }
    }

    /*
     * Finds a Markdown converter, gets the replacement, and sets it on
     * `_replacement`
     */

    function process (node) {
      var replacement
      var content = getContent(node)

      // Remove blank nodes
      if (!isVoid(node) && !/A|TH|TD/.test(node.nodeName) && /^\s*$/i.test(content)) {
        node._replacement = ''
        return
      }

      for (var i = 0; i < converters.length; i++) {
        var converter = converters[i]

        if (canConvert(node, converter.filter)) {
          if (typeof converter.replacement !== 'function') {
            throw new TypeError(
                '`replacement` needs to be a function that returns a string'
            )
          }

          var whitespace = flankingWhitespace(node, content)

          if (whitespace.leading || whitespace.trailing) {
            content = content.trim()
          }
          replacement = whitespace.leading +
              converter.replacement.call(toMarkdown, content, node) +
              whitespace.trailing
          break
        }
      }

      node._replacement = replacement
    }

    toMarkdown = function (input, options) {
      options = options || {}

      if (typeof input !== 'string') {
        throw new TypeError(input + ' is not a string')
      }

      if (input === '') {
        return ''
      }

      // Escape potential ol triggers
      input = input.replace(/(\d+)\. /g, '$1\\. ')

      var clone = htmlToDom(input).body
      var nodes = bfsOrder(clone)
      var output

      converters = mdConverters.slice(0)
      if (options.gfm) {
        converters = gfmConverters.concat(converters)
      }

      if (options.converters) {
        converters = options.converters.concat(converters)
      }

      // Process through nodes in reverse (so deepest child elements are first).
      for (var i = nodes.length - 1; i >= 0; i--) {
        process(nodes[i])
      }
      output = getContent(clone)

      return output.replace(/^[\t\r\n]+|[\t\r\n\s]+$/g, '')
          .replace(/\n\s+\n/g, '\n\n')
          .replace(/\n{3,}/g, '\n\n')
    }

    toMarkdown.isBlock = isBlock
    toMarkdown.isVoid = isVoid
    toMarkdown.outer = outer

    module.exports = toMarkdown

  },{"./lib/gfm-converters":2,"./lib/html-parser":3,"./lib/md-converters":4,"collapse-whitespace":6}],2:[function(require,module,exports){
    'use strict'

    function cell (content, node) {
      var index = Array.prototype.indexOf.call(node.parentNode.childNodes, node)
      var prefix = ' '
      if (index === 0) prefix = '| '
      return prefix + content + ' |'
    }

    var highlightRegEx = /highlight highlight-(\S+)/

    module.exports = [
      {
        filter: 'br',
        replacement: function () {
          return '\n'
        }
      },
      {
        filter: ['del', 's', 'strike'],
        replacement: function (content) {
          return '~~' + content + '~~'
        }
      },

      {
        filter: function (node) {
          return node.type === 'checkbox' && node.parentNode.nodeName === 'LI'
        },
        replacement: function (content, node) {
          return (node.checked ? '[x]' : '[ ]') + ' '
        }
      },

      {
        filter: ['th', 'td'],
        replacement: function (content, node) {
          return cell(content, node)
        }
      },

      {
        filter: 'tr',
        replacement: function (content, node) {
          var borderCells = ''
          var alignMap = { left: ':--', right: '--:', center: ':-:' }

          if (node.parentNode.nodeName === 'THEAD') {
            for (var i = 0; i < node.childNodes.length; i++) {
              var align = node.childNodes[i].attributes.align
              var border = '---'

              if (align) border = alignMap[align.value] || border

              borderCells += cell(border, node.childNodes[i])
            }
          }
          return '\n' + content + (borderCells ? '\n' + borderCells : '')
        }
      },

      {
        filter: 'table',
        replacement: function (content) {
          return '\n\n' + content + '\n\n'
        }
      },

      {
        filter: ['thead', 'tbody', 'tfoot'],
        replacement: function (content) {
          return content
        }
      },

      // Fenced code blocks
      {
        filter: function (node) {
          return node.nodeName === 'PRE' &&
              node.firstChild &&
              node.firstChild.nodeName === 'CODE'
        },
        replacement: function (content, node) {
          return '\n\n```\n' + node.firstChild.textContent + '\n```\n\n'
        }
      },

      // Syntax-highlighted code blocks
      {
        filter: function (node) {
          return node.nodeName === 'PRE' &&
              node.parentNode.nodeName === 'DIV' &&
              highlightRegEx.test(node.parentNode.className)
        },
        replacement: function (content, node) {
          var language = node.parentNode.className.match(highlightRegEx)[1]
          return '\n\n```' + language + '\n' + node.textContent + '\n```\n\n'
        }
      },

      {
        filter: function (node) {
          return node.nodeName === 'DIV' &&
              highlightRegEx.test(node.className)
        },
        replacement: function (content) {
          return '\n\n' + content + '\n\n'
        }
      }
    ]

  },{}],3:[function(require,module,exports){
    /*
     * Set up window for Node.js
     */

    var _window = (typeof window !== 'undefined' ? window : this)

    /*
     * Parsing HTML strings
     */

    function canParseHtmlNatively () {
      var Parser = _window.DOMParser
      var canParse = false

      // Adapted from https://gist.github.com/1129031
      // Firefox/Opera/IE throw errors on unsupported types
      try {
        // WebKit returns null on unsupported types
        if (new Parser().parseFromString('', 'text/html')) {
          canParse = true
        }
      } catch (e) {}

      return canParse
    }

    function createHtmlParser () {
      var Parser = function () {}

      // For Node.js environments
      if (typeof document === 'undefined') {
        var jsdom = require('jsdom')
        Parser.prototype.parseFromString = function (string) {
          return jsdom.jsdom(string, {
            features: {
              FetchExternalResources: [],
              ProcessExternalResources: false
            }
          })
        }
      } else {
        if (!shouldUseActiveX()) {
          Parser.prototype.parseFromString = function (string) {
            var doc = document.implementation.createHTMLDocument('')
            doc.open()
            doc.write(string)
            doc.close()
            return doc
          }
        } else {
          Parser.prototype.parseFromString = function (string) {
            var doc = new window.ActiveXObject('htmlfile')
            doc.designMode = 'on' // disable on-page scripts
            doc.open()
            doc.write(string)
            doc.close()
            return doc
          }
        }
      }
      return Parser
    }

    function shouldUseActiveX () {
      var useActiveX = false

      try {
        document.implementation.createHTMLDocument('').open()
      } catch (e) {
        if (window.ActiveXObject) useActiveX = true
      }

      return useActiveX
    }

    module.exports = canParseHtmlNatively() ? _window.DOMParser : createHtmlParser()

  },{"jsdom":8}],4:[function(require,module,exports){
    'use strict'
    module.exports = [
      // P标签处理
      {
        filter: 'p',
        replacement: function (content, node) {
          var attrClass = node.getAttribute('class') || ''

          if (attrClass === 'command') {
            if (!content.endsWith('\n')) {
              content += '\n'
            }
            return '\n```\n' + content + '```\n'
          } else {
            return '\n\n' + content + '\n\n'
          }
        }
      },
      // BR 標籤處理
      {
        filter: 'br',
        replacement: function () {
          return '  \n'
        }
      },
      // H1 處理
      {
        filter: 'h1',
        replacement: function (content, node) {
          if (typeof titleLock === "undefined") {
            var titleLock = false;
          }
          if (!titleLock) {
            titleLock = true;
            return content + "\n" + "=".repeat(60);
          }
          else {
            return '\n\n' + '# ' + content + '\n\n'
          }
        }
      },
      // H2-H7 標籤處理
      {
        filter: ['h2', 'h3', 'h4', 'h5', 'h6', 'h7'],
        replacement: function (content, node) {
          var hLevel = node.nodeName.charAt(1)
          var hPrefix = '##'
          hLevel = hLevel - 2
          for (var i = 0; i < hLevel; i++) {
            hPrefix += '#'
          }
          return '\n\n' + hPrefix + ' ' + content + '\n\n'
        }
      },
      // HR 標籤處理
      {
        filter: 'hr',
        replacement: function () {
          return '\n\n* * *\n\n'
        }
      },
      // em i 斜體處理
      {
        filter: ['em', 'i'],
        replacement: function (content) {
          return ' _' + content + '_ '
        }
      },
      // Strong b 粗體處理
      {
        filter: ['strong', 'b'],
        replacement: function (content) {
          return '**' + content + '**'
        }
      },
      // Inline code
      {
        filter: function (node) {
          var hasSiblings = node.previousSibling || node.nextSibling
          var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings

          return node.nodeName === 'CODE' && !isCodeBlock
        },
        replacement: function (content) {
          return '`' + content + '`'
        }
      },
      // A 標籤處理
      {
        filter: function (node) {
          return node.nodeName === 'A' && node.getAttribute('href')
        },
        replacement: function (content, node) {
          return '[' + content + '](' + node.getAttribute('href') + ')'
        }
      },
      // 特殊情况下的A標籤處理
      {
        filter: function (node) {
          return node.nodeName === 'A' && node.getAttribute('style')
        },
        replacement: function (content, node) {
          return content
        }
      },
      // IMG 標籤處理
      {
        filter: 'img',
        replacement: function (content, node) {
          var alt = node.alt || ''
          var src = node.getAttribute('src') || ''
          var title = node.title || ''
          var titlePart = title ? ' "' + title + '"' : ''
          return src ? '\n![' + alt + ']' + '(' + src + titlePart + ')\n' : ''
        }
      },
      // 代碼塊處理
      {
        filter: 'pre',
        replacement: function (content, node) {
          let contentText = node.innerText
          if (!contentText.endsWith('\n')) {
            contentText += '\n'
          }
          return '\n```\n' + contentText + '```\n'
        }
      },
      // 行内代碼處理
      {
        filter: 'code',
        replacement: function (content, node) {
          return '`' + content + '`'
        }
      },
      // IFrame 提醒
      {
        filter: 'iframe',
        replacement: function (content, node) {
          console.log(node);
          console.log(content);
          return '\n ** 此处有iframe,请手动处理 ** \n'
        }
      },
      // Canvas 提醒
      {
        filter: 'canvas',
        replacement: function (content, node) {
          return '\n ** 此处有Canvas,请手动处理 ** \n'
        }
      },
      // div 處理
      {
        filter: 'div',
        replacement: function (content, node) {
          var attrClass = node.getAttribute('class') || ''
          if (attrClass === 'code') {
            if (!content.endsWith('\n')) {
              content += '\n'
            }
            return '\n```\n' + content + '```\n'
          } else {
            return content
          }
        }
      },
      {
        'filter': 'textarea',
        replacement: function (content, node) {
          return ''
        }
      },
      // 直接返回内容的標籤
      {
        filter: ['figure', 'span', 'small', 'section', 'font', 'asymspc', 'button', 'article', 'figcaption'],
        replacement: function (content) {
          return content
        }
      },
      // 引用
      {
        filter: 'blockquote',
        replacement: function (content) {
          content = content.trim()
          content = content.replace(/\n{3,}/g, '\n\n')
          content = content.replace(/^/gm, '> ')
          return '\n\n' + content + '\n\n'
        }
      },
      // 列表項
      {
        filter: 'li',
        replacement: function (content, node) {
          content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ')
          var prefix = '*   '
          var parent = node.parentNode
          var index = Array.prototype.indexOf.call(parent.children, node) + 1

          prefix = /ol/i.test(parent.nodeName) ? index + '.  ' : '*   '
          return prefix + content + '\n'
        }
      },
      // 有序／無序列表
      {
        filter: ['ul', 'ol'],
        replacement: function (content, node) {
          var strings = []
          for (var i = 0; i < node.childNodes.length; i++) {
            strings.push(node.childNodes[i]._replacement)
          }

          if (/li/i.test(node.parentNode.nodeName)) {
            return '\n' + strings.join('\n')
          }
          return '\n\n' + strings.join('\n') + '\n\n'
        }
      },
      // 判斷是否是block，如果是block，前後加空行
      {
        filter: function (node) {
          return this.isBlock(node)
        },
        replacement: function (content, node) {
          return '\n\n' + this.outer(node, content) + '\n\n'
        }
      },

      // Anything else!
      {
        filter: function () {
          return true
        },
        replacement: function (content, node) {
          return this.outer(node, content)
        }
      }
    ]

  },{}],5:[function(require,module,exports){
    /**
     * This file automatically generated from `build.js`.
     * Do not manually edit.
     */

    module.exports = [
      "address",
      "article",
      "aside",
      "blockquote",
      "canvas",
      "dd",
      "div",
      "dl",
      "dt",
      "fieldset",
      "figcaption",
      "figure",
      "footer",
      "form",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "h7",
      "header",
      "hgroup",
      "hr",
      "li",
      "main",
      "nav",
      "noscript",
      "ol",
      "output",
      "p",
      "pre",
      "section",
      "table",
      "tfoot",
      "ul",
      "video"
    ];

  },{}],6:[function(require,module,exports){
    'use strict';

    var voidElements = require('void-elements');
    Object.keys(voidElements).forEach(function (name) {
      voidElements[name.toUpperCase()] = 1;
    });

    var blockElements = {};
    require('block-elements').forEach(function (name) {
      blockElements[name.toUpperCase()] = 1;
    });

    /**
     * isBlockElem(node) determines if the given node is a block element.
     *
     * @param {Node} node
     * @return {Boolean}
     */
    function isBlockElem(node) {
      return !!(node && blockElements[node.nodeName]);
    }

    /**
     * isVoid(node) determines if the given node is a void element.
     *
     * @param {Node} node
     * @return {Boolean}
     */
    function isVoid(node) {
      return !!(node && voidElements[node.nodeName]);
    }

    /**
     * whitespace(elem [, isBlock]) removes extraneous whitespace from an
     * the given element. The function isBlock may optionally be passed in
     * to determine whether an element is a block element; if none
     * is provided, defaults to using the list of block elements provided
     * by the `block-elements` module.
     *
     * @param {Node} elem
     * @param {Function} blockTest
     */
    function collapseWhitespace(elem, isBlock) {
      if (!elem.firstChild || elem.nodeName === 'PRE') return;

      if (typeof isBlock !== 'function') {
        isBlock = isBlockElem;
      }

      var prevText = null;
      var prevVoid = false;

      var prev = null;
      var node = next(prev, elem);

      while (node !== elem) {
        if (node.nodeType === 3) {
          // Node.TEXT_NODE
          var text = node.data.replace(/[ \r\n\t]+/g, ' ');

          if ((!prevText || / $/.test(prevText.data)) && !prevVoid && text[0] === ' ') {
            text = text.substr(1);
          }

          // `text` might be empty at this point.
          if (!text) {
            node = remove(node);
            continue;
          }

          node.data = text;
          prevText = node;
        } else if (node.nodeType === 1) {
          // Node.ELEMENT_NODE
          if (isBlock(node) || node.nodeName === 'BR') {
            if (prevText) {
              prevText.data = prevText.data.replace(/ $/, '');
            }

            prevText = null;
            prevVoid = false;
          } else if (isVoid(node)) {
            // Avoid trimming space around non-block, non-BR void elements.
            prevText = null;
            prevVoid = true;
          }
        } else {
          node = remove(node);
          continue;
        }

        var nextNode = next(prev, node);
        prev = node;
        node = nextNode;
      }

      if (prevText) {
        prevText.data = prevText.data.replace(/ $/, '');
        if (!prevText.data) {
          remove(prevText);
        }
      }
    }

    /**
     * remove(node) removes the given node from the DOM and returns the
     * next node in the sequence.
     *
     * @param {Node} node
     * @return {Node} node
     */
    function remove(node) {
      var next = node.nextSibling || node.parentNode;

      node.parentNode.removeChild(node);

      return next;
    }

    /**
     * next(prev, current) returns the next node in the sequence, given the
     * current and previous nodes.
     *
     * @param {Node} prev
     * @param {Node} current
     * @return {Node}
     */
    function next(prev, current) {
      if (prev && prev.parentNode === current || current.nodeName === 'PRE') {
        return current.nextSibling || current.parentNode;
      }

      return current.firstChild || current.nextSibling || current.parentNode;
    }

    module.exports = collapseWhitespace;

  },{"block-elements":5,"void-elements":7}],7:[function(require,module,exports){
    /**
     * This file automatically generated from `pre-publish.js`.
     * Do not manually edit.
     */

    module.exports = {
      "area": true,
      "base": true,
      "br": true,
      "col": true,
      "embed": true,
      "hr": true,
      "img": true,
      "input": true,
      "keygen": true,
      "link": true,
      "menuitem": true,
      "meta": true,
      "param": true,
      "source": true,
      "track": true,
      "wbr": true
    };

  },{}],8:[function(require,module,exports){

  },{}]},{},[1])(1)
});

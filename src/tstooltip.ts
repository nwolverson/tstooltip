import $ from 'jquery'; 

class TextIterator {
  static iterate(node : Node, callback: (elt: Node, i: number) => void) {
    var treeWalker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, null);
    var i = 0;
    var nextNode = treeWalker.nextNode();
    while (nextNode) {
      var curNode = nextNode;
      nextNode = treeWalker.nextNode();

      callback(curNode, i);
      i += curNode.nodeValue.length;
    }
  }
}

interface QueueItem {
  text: string;
  elt: JQuery;
}

class TooltipGenerator {
  blocks: QueueItem[] = [];
  exprs: QueueItem[] = [];
  count = 0;
  testWorker: Worker;

  queueChecks() {
    $("pre > code").each((_, el) => {
      var $el = $(el);
      $el.addClass("ts-checked");
      var text = $el.text();

      this.testWorker.postMessage({ sort: 'statement', text: text, id: this.blocks.length});
      this.blocks.push({text: text, elt: $el});
    });
    $("code").each((i, el) => {
      var $el = $(el);
      if ($el.hasClass("ts-checked"))
      {
        return;
      }
      var text = $el.text();

      this.testWorker.postMessage({ sort: 'expr', text: text, id: this.exprs.length});
      this.exprs.push({text: text, elt: $el});
    });
    this.count = this.blocks.length + this.exprs.length;
  }

  processResult(data: { id: number; res: any; sort: string}) {
    function intersects(span, start: number, length: number) {
      return span.start <= start+length && span.start + span.length >= start;
    }
    var arr = data.sort == "expr" ? this.exprs : this.blocks;
    var $el = arr[data.id].elt;
    var res = data.res;

    if (data.sort == "expr") {
      var tooltip;
      if (res.error) {
          tooltip = "Error: " + res.output;
          $el.addClass("error");
      } else {
          tooltip = res.type;
          $el.addClass("typed");
      }
      $el.attr("title", tooltip);
    } else {
      if (!res) {
        return;
      }

      TextIterator.iterate($el[0], (elt, textpos) => {
        var text = elt.nodeValue;

        var curPos = 0;
        var chunks = [];
        res.forEach(r => {
            var span: { start: number; length: number } = r.pos;
          if (intersects(span, textpos, text.length)) {
            var start = Math.max(span.start - textpos, curPos);
            var end = Math.min((span.start+span.length) - textpos, text.length);

            // Span reported by type.textSpan includes leading whitespace
            while (start <= end && text.charAt(start).search(/\s/) !== -1) {
              start++;
            }

            if (start - curPos > 0) {
              // Unconsumed text which won't be included in this span
              chunks.push(text.substring(curPos, start));
            }

            if (end - start > 0) {
              // Remainder of text up to end is marked up for this span
              var elt = $("<span>");
              elt.text(text.substring(start, end));
              elt.addClass("ts-typeinfo");
              var title = r.type.fullSymbolName + " (" + r.type.kind + "): "+ r.type.memberName.toString();
              elt.attr("title", title);
              chunks.push(elt);
            }

            curPos = end;
          }
        });
        chunks.push(text.substring(curPos, text.length));

        // can't seem to replaceWith
        $(elt).after(chunks);
        $(elt).remove();
      });
    }
  }

  generate() {
    var startTime = window.performance ? window.performance.now() : Date.now();

    this.testWorker = new Worker("dist/worker.js");
    this.testWorker.onmessage = result => {
      if (result.data == "ready") {
        this.queueChecks();

      } else {
        this.processResult(result.data);
        this.count--;
        if (this.count == 0) {
            var endTime = window.performance ? window.performance.now() : Date.now();

            console.log("Completed in: " + (endTime - startTime) + "ms");
        }
      }
    };
  }
}

$(_ => {
  var generator = new TooltipGenerator();
  generator.generate();
});


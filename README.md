# tstooltip
TypeScript tooltips using ts compiler in the browser

### Getting Started

Written in TypeScript, builds with local TS 1.4 compiler. After checking out, build the script:

    npm install
    grunt
  
When referenced, any inline `<code>` elements will be processed in a simplistic fashion as expressions and `<pre><code>` blocks will
be processed as statements (with identifier based tooltips).

[Demo page here](http://nwolverson.uk/tstooltip/test.html).

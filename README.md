# tstooltip
TypeScript tooltips using ts compiler in the browser

### Getting Started

Written in TypeScript, makes use of nightly typescript@next dependency which currently is a pre-2.3 release. After checking out, build the script:

    npm run build
  
When referenced, any inline `<code>` elements will be processed in a simplistic fashion as expressions and `<pre><code>` blocks will
be processed as statements (with identifier based tooltips).

[Demo page here](http://nwolverson.uk/tstooltip/test.html).

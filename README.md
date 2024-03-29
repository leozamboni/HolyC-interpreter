# HolyC Interpreter

A small sandboxed handwritten HolyC interpreter in JavaScript.

[Demo](https://leozamboni.github.io/HolyC-interpreter/)

If you want a CLI use [HolyC repl](https://github.com/leozamboni/HolyC-repl).

## Run

```
bun dev
```

### Dependencies

- bun

## Self host

For local run you will need a HTTP server:

```
bun dev
```

Create a input tag with "stdin" tag and another with "stdout/stderr":

```html
<textarea id="stdin"></textarea> <textarea id="stdout/stderr"></textarea>
```

The stdin will be for the code and the stdout/stderr for the interpreter output.

Import this procedure in your BOM inside the head tag:

```html
<script defer type="module">
  import { holyc_web_run } from "./holy.js";
  window.holyc_web_run = holyc_web_run;
</script>
```

And call this procedure with a button, for example:

```html
<button onclick="holyc_web_run()">RUN(▶)</button>
```

<hr/>

If you want to support this project you can star the repository.

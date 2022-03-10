/**
 * @Copyright Leonardo Z. Nunes 2022
 * @license MIT
 * @fileoverview JS HolyC Interpreter
 * @version 0.0.0
 */

var version = "0.0.0";

document.getElementById(
  "output"
).value = `HolyC Interpreter version ${version}\n`;
document.getElementById("code").value = '"hello world";';

document.getElementById("code").addEventListener("keydown", function (e) {
  if (e.key == "Tab") {
    e.preventDefault();
    let start = this.selectionStart;
    let end = this.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    this.value =
      this.value.substring(0, start) + "\t" + this.value.substring(end);

    // put caret at right position again
    this.selectionStart = this.selectionEnd = start + 1;
  }
});

/**
 * JS HolyC AST
 * @constructor
 */
class Ast {
  token = null;
  next = null;
  left = null;
  right = null;
  constructor(type) {
    this.type = type;
  }
}

/**
 * JS HolyC expression list
 * @constructor
 */
class ExpList {
  next = null;
  ast = null;
}

/**
 * symbol table
 * @global
 */
var glSymTab = [];

/**
 * index for token list iteration
 * @global
 */
var glWalk;

/**
 * enum for token types.
 * @readonly
 * @enum {number}
 */
var tokenType = {
  const: 1,
  str: 2,
  id: 3,
  add: 4,
  sub: 5,
  div: 6,
  mul: 7,
  semi: 8,
  lbrace: 9,
  rbrace: 10,
  i0: 11,
  u0: 12,
  i8: 13,
  u8: 14,
  i16: 15,
  u16: 16,
  i32: 17,
  u32: 18,
  i64: 19,
  u64: 20,
  f64: 21,
  rparen: 22,
  lparen: 23,
  call: 24,
  comma: 25,
  assig: 26,
  less: 27,
  big: 28,
  for: 29,
};

/**
 * examples list of currently implemented features
 * @global
 */
var examples = () => {
  switch (document.getElementById("examples").value) {
    case "helloWorld":
      document.getElementById("code").value =
        "// HolyC Hello world\n" +
        '"Holy World\\n";\n\n' +
        "U0\n" +
        "HelloWorld()\n" +
        "{\n" +
        '\t"Holy World\\n";\n' +
        "}\n\n" +
        "U0\n" +
        "World()\n" +
        "{\n" +
        "\t'World\\n';\n" +
        "}\n\n" +
        "U0\n" +
        "Hello()\n" +
        "{\n" +
        "\t'Ho';\n\t'l', 'y';\n\t' ';\n" +
        "\tWorld();\n" +
        "}\n\n" +
        "'\\t';\n" +
        "Hello;\n" +
        "'\\n';\n" +
        'HelloWorld("*");\n';
      break;
    case "fibonacci":
      document.getElementById("code").value =
        "// HolyC Fibonacci\n" +
        "I32 a;\n" +
        "I32 b;\n" +
        "I32 c;\n\n" +
        "a = 0;\n" +
        "b = 1;\n\n" +
        "I32 i;\n" +
        "for (i = 0; i < 20; i++) {\n" +
        "\tc = a + b;\n" +
        '\t"%d\\n", c;\n' +
        "\ta = b;\n" +
        "\tb = c;\n" +
        "}\n";
      break;
    default:
      document.getElementById("code").value = "";
  }
};

/**
 * get index of a symbol in symbol table
 * @global
 */
var get_symtab = (token) => {
  for (let i = 0; i < glSymTab.length; ++i) {
    if (glSymTab[i].value === token.value) return i;
  }
};

/**
 * set arguments of a symbol in symbol table
 * @global
 */
var set_argsymtab = (ast, symtabNode, priorWalk, tokenList) => {
  symtabNode.args = [];
  let auxArgNode = {};

  for (let i = priorWalk; i < glWalk; ++i) {
    if (tokenList[i].type === tokenType.assig) continue;
    if (tokenList[i].type === tokenType.comma) {
      symtabNode.args.push(auxArgNode);
      auxArgNode = {};
    } else if (is_dtype(tokenList[i].type)) {
      auxArgNode.type = tokenList[i];
    } else if (tokenList[i].type === tokenType.id) {
      auxArgNode.id = tokenList[i];
    } else {
      auxArgNode.value = tokenList[i];
    }
  }
  symtabNode.args.push(auxArgNode);

  glSymTab.push(symtabNode);
};

/**
 * clear output textarea
 * @global
 */
var clear_output = () => {
  document.getElementById(
    "output"
  ).value = `HolyC Interpreter version ${version}\n`;
};

/**
 * check if value is alphanumeric
 * @global
 * @arg {number} val - token value
 */
var is_alpha = (val) => {
  if (val === " " || val === "\n") return false;
  return /^[A-Z0-9]$/i.test(val);
};

/**
 * check if value is alphanumeric
 * @global
 * @arg {number} val - token value
 */
var is_digit = (val) => {
  if (val === " " || val === "\n") return false;
  return !isNaN(val);
};

/**
 * throw lexer error
 * @global
 * @arg {object} token
 */
var lexer_error = (token) => {
  let output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error(
    (output.value += `lexer: '${token.value}' unexpected value in line ${token.line}\n`)
  );
};

/**
 * throw parser error
 * @global
 * @arg {object} token
 */
var parser_error = (token) => {
  let output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error(
    (output.value += `parser: '${token.value}' unexpected value in line ${token.line}\n`)
  );
};

/**
 * remove tabulation from string
 * @global
 * @arg {number} val - token value
 */
var remove_tabs = (val) => {
  return val.replace(/\t/g, "");
};

/**
 * throw parser error
 * @global
 * @arg {object} token
 * @arg {number} expectedType
 */
var list_eat = (token, expectedType) => {
  token?.type !== expectedType ? parser_error(token) : glWalk++;
};

/**
 * check if token is in symbol table
 * @global
 * @arg {object} token
 */
var symtab_contain = (token) => {
  if (!glSymTab.filter((e) => e.value === token.value).length) {
    return false;
  }
  return true;
};

/**
 * check if token type is a data type
 * @global
 * @arg {number} type - token type
 */
var is_dtype = (type) => {
  if (
    type === tokenType.i0 ||
    type === tokenType.u0 ||
    type === tokenType.i8 ||
    type === tokenType.u8 ||
    type === tokenType.i16 ||
    type === tokenType.u16 ||
    type === tokenType.i32 ||
    type === tokenType.u32 ||
    type === tokenType.i64 ||
    type === tokenType.u64 ||
    type === tokenType.f64
  ) {
    return true;
  }
  return false;
};

/**
 * check if token type is a logical operator
 * @global
 * @arg {number} type - token type
 */
var is_logicalop = (type) => {
  if (type === tokenType.big || type === tokenType.less) {
    return true;
  }
  return false;
};

/**
 * check if token type is a mathematical operator
 * @global
 * @arg {number} type - token type
 */
var is_mathop = (type) => {
  if (
    type === tokenType.add ||
    type === tokenType.sub ||
    type === tokenType.div ||
    type === tokenType.mul
  ) {
    return true;
  }
  return false;
};

/**
 * increment glWalk to next node in token list if token type is data type
 * @global
 * @arg {object} token
 */
var list_eat_type = (token) => {
  is_dtype(token.type) ? glWalk++ : parser_error(token);
};

/**
 * increment glWalk to next node in token list if token type is logical operator
 * @global
 * @arg {object} token
 */
var list_eat_logical = (token) => {
  is_logicalop(token.type) ? glWalk++ : parser_error(token);
};

/**
 * increment glWalk to next node in token list if token type is mathematical operator
 * @global
 * @arg {object} token
 */
var list_eat_math = (token) => {
  is_mathop(token.type) ? glWalk++ : parser_error(token);
};

/**
 * number token data type to string
 * @global
 * @arg {number} val - token value
 */
var get_type = (val) => {
  switch (val) {
    case "I0":
      return tokenType.i0;
    case "U0":
      return tokenType.u0;
    case "I8":
      return tokenType.i8;
    case "U8":
      return tokenType.u8;
    case "I16":
      return tokenType.i16;
    case "U16":
      return tokenType.u16;
    case "I32":
      return tokenType.i32;
    case "U32":
      return tokenType.u32;
    case "I64":
      return tokenType.i64;
    case "U64":
      return tokenType.u64;
    case "F64":
      return tokenType.f64;
    default:
      console.log("UNKNOWN TYPE");
  }
};

/**
 * lexical analysis of HolyC data types
 * @arg {array} tokenList - current lexer token list
 * @arg {number} line - line of token
 * @arg {string} input - current input string
 * @arg {number} i - current string index
 */
function holyc_lex_type(tokenList, line, input, i) {
  if (input[i] === "U" || input[i] === "I" || input[i] === "F") {
    if (input[i + 1] === "0" || input[i + 1] === "8") {
      if (input[i + 1] === "0" && input[i] !== "U" && input[i] !== "I") {
        return false;
      }
      aux = input[i++];
      aux += input[i];
      tokenList.push({
        value: aux,
        line: line,
        type: get_type(aux),
      });
      return i;
    } else if (
      (input[i + 1] === "1" && input[i + 2] === "6") ||
      (input[i + 1] === "3" && input[i + 2] === "2") ||
      (input[i + 1] === "6" && input[i + 2] === "4")
    ) {
      if (
        (input[i] === "F" && input[i + 1] !== "6") ||
        (input[i] === "F" && input[i + 2] !== "4")
      ) {
        return false;
      }
      aux = input[i++];
      aux += input[i++];
      aux += input[i];
      tokenList.push({
        value: aux,
        line: line,
        type: get_type(aux),
      });
      return i;
    } else {
      return false;
    }
  }
  return false;
}

/**
 * JS HolyC lexer
 * @arg {string} input - input string
 */
function holyc_lex(input) {
  input = remove_tabs(input);

  var tokenList = [];
  var line = 1;

  for (let i = 0; i < input.length; ++i) {
    if (input[i] === "\n") line++;
    if (input[i] === " " || input[i] === "\n") continue;

    if (input[i] === "/" && input[i + 1] === "/") {
      i++;
      while (input[i] !== "\n") {
        i++;
      }
      continue;
    }

    if (input[i] === "'") {
      let aux = "";

      i++;

      while (input[i] !== "'" && input[i]) {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.str,
      });

      continue;
    }

    if (input[i] === '"') {
      let aux = "";

      i++;

      while (input[i] !== '"' && input[i]) {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.str,
      });

      continue;
    }

    if (is_digit(input[i])) {
      let aux = "";

      while (is_digit(input[i])) {
        aux += input[i++];
      }

      i--;

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.const,
      });

      continue;
    }

    if (is_alpha(input[i])) {
      let aux = "";

      if ((y = holyc_lex_type(tokenList, line, input, i))) {
        i = y;
        continue;
      }

      while (is_alpha(input[i])) {
        aux += input[i++];
      }

      i--;

      let type;

      switch (aux) {
        case "for":
          type = tokenType.for;
          break;
        default:
          type = tokenType.id;
      }

      tokenList.push({
        value: aux,
        line: line,
        type: type,
      });

      continue;
    }

    switch (input[i]) {
      case "+":
        tokenList.push({
          value: "+",
          line: line,
          type: tokenType.add,
        });
        break;
      case "-":
        tokenList.push({
          value: "-",
          line: line,
          type: tokenType.sub,
        });
        break;
      case "*":
        tokenList.push({
          value: "*",
          line: line,
          type: tokenType.mul,
        });
        break;
      case "/":
        tokenList.push({
          value: "/",
          line: line,
          type: tokenType.div,
        });
        break;
      case ";":
        tokenList.push({
          value: ";",
          line: line,
          type: tokenType.semi,
        });
        break;
      case "{":
        tokenList.push({
          value: "{",
          line: line,
          type: tokenType.rbrace,
        });
        break;
      case "}":
        tokenList.push({
          value: "}",
          line: line,
          type: tokenType.lbrace,
        });
        break;
      case "(":
        tokenList.push({
          value: "(",
          line: line,
          type: tokenType.rparen,
        });
        break;
      case ")":
        tokenList.push({
          value: ")",
          line: line,
          type: tokenType.lparen,
        });
        break;
      case ",":
        tokenList.push({
          value: ",",
          line: line,
          type: tokenType.comma,
        });
        break;
      case "=":
        tokenList.push({
          value: "=",
          line: line,
          type: tokenType.assig,
        });
        break;
      case "<":
        tokenList.push({
          value: "<",
          line: line,
          type: tokenType.less,
        });
        break;
      case ">":
        tokenList.push({
          value: ">",
          line: line,
          type: tokenType.big,
        });
        break;
      default:
        lexer_error({ value: input[i], line: line });
        break;
    }
  }
  console.log(tokenList);
  return tokenList;
}

/**
 * semantic analysis of expresions
 * @arg {array} tokenList
 */
function holyc_parser_parse_exp(tokenList) {
  if (tokenList[glWalk].type === tokenType.semi) return null;

  let ast;

  if (tokenList[glWalk - 1].type === tokenType.id) {
    if (is_mathop(tokenList[glWalk].type)) {
      if (
        tokenList[glWalk + 1].type === tokenType.id ||
        tokenList[glWalk + 1].type === tokenType.const
      ) {
        ast = new Ast(tokenList[glWalk].type);
        ast.token = tokenList[glWalk];
        list_eat_math(tokenList[glWalk]);
      } else if (
        tokenList[glWalk].type === tokenType.add ||
        tokenList[glWalk].type === tokenType.sub
      ) {
        let priorOp = tokenList[glWalk].type;

        ast = new Ast(tokenList[glWalk].type);
        ast.token = tokenList[glWalk];
        list_eat_math(tokenList[glWalk]);

        if (tokenList[glWalk].type === priorOp) {
          ast.left = new Ast(tokenList[glWalk].type);
          ast.left.token = tokenList[glWalk];
          list_eat_math(tokenList[glWalk]);
        }
      }
    } else {
      ast = new Ast(tokenType.assig);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.assig);
    }
  } else if (tokenList[glWalk - 1].type === tokenType.assig) {
    if (tokenList[glWalk].type !== tokenType.id) {
      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.const);
    } else {
      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.id);
    }
  } else if (is_mathop(tokenList[glWalk - 1].type)) {
    if (
      (tokenList[glWalk - 1].type === tokenType.add &&
        tokenList[glWalk].type === tokenType.add) ||
      (tokenList[glWalk - 1].type === tokenType.sub &&
        tokenList[glWalk].type === tokenType.sub)
    ) {
      ast = new Ast(tokenList[glWalk].type);
      ast.token = tokenList[glWalk];
      list_eat_math(tokenList[glWalk]);
    } else if (tokenList[glWalk].type !== tokenType.id) {
      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.const);
    } else {
      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.id);
    }
  } else if (tokenList[glWalk].type === tokenType.id) {
    ast = new Ast(tokenType.id);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.id);
  } else if (tokenList[glWalk].type !== tokenType.semi) {
    ast = new Ast(tokenType.comma);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);
  } else {
    parser_error(tokenList[glWalk]);
  }

  ast.right = holyc_parser_parse_exp(tokenList);

  return ast;
}

/**
 * semantic analysis of string arguments
 * @arg {array} tokenList
 */
function holyc_parser_parse_str_args(tokenList) {
  if (tokenList[glWalk].type === tokenType.semi) return null;

  let ast;

  if (
    tokenList[glWalk].type === tokenType.id ||
    tokenList[glWalk].type === tokenType.const
  ) {
    ast = new Ast(tokenList[glWalk].type);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenList[glWalk].type);
  } else if (tokenList[glWalk].type === tokenType.str) {
    ast = new Ast(tokenType.str);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.str);
  } else {
    ast = holyc_parser_parse_exp(tokenList);
  }

  if (tokenList[glWalk].type === tokenType.assig) {
    ast.left = new Ast(tokenType.assig);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.assig);

    ast.left.right = holyc_parser_parse_exp(tokenList);
  }

  if (tokenList[glWalk].type !== tokenType.semi) {
    ast.left.left = new Ast(tokenType.comma);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);
  }

  ast.right = holyc_parser_parse_str_args(tokenList);

  return ast;
}

/**
 * semantic analysis of strings
 * @arg {array} tokenList
 */
function holyc_parser_parse_str(tokenList) {
  let symtabNode = tokenList[glWalk];

  let ast = new Ast(tokenType.str);
  ast.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.str);

  if (!tokenList[glWalk]) parser_error(tokenList[glWalk - 1]);

  if (tokenList[glWalk].type === tokenType.semi) {
    ast.next = new Ast(tokenType.semi);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.semi);
  } else {
    ast.next = new Ast(tokenType.comma);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);

    if (tokenList[glWalk].type !== tokenType.semi) {
      let priorWalk = glWalk;

      holyc_parser_parse_str_args(tokenList);

      set_argsymtab(ast, symtabNode, priorWalk, tokenList);

      ast.next.next = new Ast(tokenType.semi);
      ast.next.next.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.semi);
    }
  }

  return ast;
}

/**
 * semantic analysis of blocks
 * @arg {array} tokenList
 */
function holyc_parser_parse_block(tokenList) {
  if (tokenList[glWalk].type === tokenType.lbrace) return null;

  let ast;

  switch (tokenList[glWalk].type) {
    case tokenType.id:
      ast = holyc_parser_parse_id(tokenList);
      break;
    case tokenType.str:
      ast = holyc_parser_parse_str(tokenList);
      break;
    default:
      parser_error(tokenList[glWalk]);
  }

  ast.right = holyc_parser_parse_block(tokenList);

  return ast;
}

/**
 * semantic analysis of procedures arguments
 * @arg {array} tokenList
 */
function holyc_parser_parse_args(tokenList = []) {
  if (tokenList[glWalk].type === tokenType.lparen) return null;

  let ast = new Ast(tokenList[glWalk].type);
  ast.token = tokenList[glWalk];
  list_eat_type(tokenList[glWalk]);

  ast.next = new Ast(tokenType.id);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  if (tokenList[glWalk].type === tokenType.assig) {
    ast.next.next = new Ast(tokenType.assig);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.assig);

    if (tokenList[glWalk].type === tokenType.const) {
      ast.next.next.next = new Ast(tokenType.const);
      ast.next.next.next.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.const);
    } else {
      ast.next.next.next = new Ast(tokenType.str);
      ast.next.next.next.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.str);
    }
  }

  if (tokenList[glWalk].type !== tokenType.lparen) {
    ast.next.next = new Ast(tokenType.comma);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);
  }

  ast.right = holyc_parser_parse_args(tokenList);

  return ast;
}

/**
 * semantic analysis of procedures call arguments
 * @arg {array} tokenList
 * @arg {number} symIndex - index of procedure symbol
 * @arg {number} i - number of arguments
 */
function holyc_parser_parse_call_args(tokenList, symIndex, i) {
  if (tokenList[glWalk].type === tokenType.lparen) return null;

  let ast;

  if (glSymTab[symIndex]?.args[i]?.value) {
    if (tokenList[glWalk].type === tokenType.comma) {
      ast = new Ast(tokenType.comma);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.comma);
    } else {
      ast = new Ast(tokenList[glWalk].type);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenList[glWalk].type);
    }
  } else {
    ast = new Ast(tokenList[glWalk].type);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenList[glWalk].type);
  }

  if (tokenList[glWalk].type !== tokenType.lparen) {
    ast.left = new Ast(tokenType.comma);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);
  }

  ast.right = holyc_parser_parse_call_args(tokenList, symIndex, ++i);

  return ast;
}

/**
 * semantic analysis of procedures call
 * @arg {array} tokenList
 */
function holyc_parser_parse_call(tokenList) {
  if (!symtab_contain(tokenList[glWalk])) {
    parser_error(tokenList[glWalk]);
  }

  let symIndex = get_symtab(tokenList[glWalk]);

  let ast = new Ast(tokenType.call);
  ast.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  if (tokenList[glWalk].type === tokenType.semi) {
    ast.next = new Ast(tokenType.semi);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.semi);
  } else {
    ast.next = new Ast(tokenType.rparen);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.rparen);

    if (tokenList[glWalk].type === tokenType.str) {
      if (tokenList[glWalk].value === "*") {
        ast.next = new Ast(tokenType.str);
        ast.next.token = tokenList[glWalk];
        list_eat(tokenList[glWalk], tokenType.str);
      }
    }

    if (glSymTab[symIndex]?.args) {
      ast.right = holyc_parser_parse_call_args(tokenList, symIndex, 0);
    }

    ast.next = new Ast(tokenType.lparen);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.lparen);

    ast.next = new Ast(tokenType.semi);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.semi);
  }

  return ast;
}

/**
 * semantic analysis of inline variables declaration
 * @arg {array} tokenList
 */
function holyc_parser_parse_inline_vars(tokenList) {
  if (tokenList[glWalk].type === tokenType.semi) return null;

  glSymTab.push(tokenList[glWalk]);

  let ast = new Ast(tokenType.id);
  ast.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  if (tokenList[glWalk].type !== tokenType.semi) {
    ast.left = new Ast(tokenType.comma);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);
  }

  ast.right = holyc_parser_parse_inline_vars(tokenList);

  return ast;
}

/**
 * semantic analysis of identifiers
 * @arg {array} tokenList
 */
function holyc_parser_parse_id(tokenList) {
  if (tokenList[glWalk].type === tokenType.id) {
    if (tokenList[glWalk + 1].type === tokenType.assig) {
      let ast = holyc_parser_parse_exp(tokenList);

      ast.left = new Ast(tokenType.semi);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.semi);

      return ast;
    } else {
      return holyc_parser_parse_call(tokenList);
    }
  }

  let ast = new Ast(tokenList[glWalk].type);
  ast.token = tokenList[glWalk];
  list_eat_type(tokenList[glWalk]);

  let symtabNode = tokenList[glWalk];

  ast.next = new Ast(tokenType.id);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  if (tokenList[glWalk].type === tokenType.semi) {
    glSymTab.push(symtabNode);

    ast.right = new Ast(tokenType.semi);
    ast.right.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.semi);
  } else if (tokenList[glWalk].type === tokenType.comma) {
    glSymTab.push(symtabNode);

    ast.next = new Ast(tokenType.comma);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.comma);

    ast.right = holyc_parser_parse_inline_vars(tokenList);

    ast.next.next = new Ast(tokenType.semi);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.semi);
  } else if (tokenList[glWalk].type === tokenType.assig) {
    ast.right = holyc_parser_parse_exp(tokenList);
  } else {
    ast.next.next = new Ast(tokenType.rparen);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.rparen);

    let priorWalk = glWalk;

    ast.next.next.right = holyc_parser_parse_args(tokenList);

    set_argsymtab(ast, symtabNode, priorWalk, tokenList);

    ast.next.next.next = new Ast(tokenType.lparen);
    ast.next.next.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.lparen);

    ast.left = new Ast(tokenType.rbrace);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.rbrace);

    ast.right = holyc_parser_parse_block(tokenList);

    ast.right.next = new Ast(tokenType.lbrace);
    ast.right.next.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.lbrace);
  }

  return ast;
}

/**
 * semantic analysis of variable increment
 * @arg {array} tokenList
 */
function holyc_parser_parse_increment(tokenList) {
  let ast;

  if (is_mathop(tokenList[glWalk].type)) {
    if (tokenList[glWalk].type === tokenType.add) {
      ast = new Ast(tokenType.add);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.add);

      ast.left = new Ast(tokenType.add);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.add);
    } else {
      ast = new Ast(tokenType.sub);
      ast.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.sub);

      ast.left = new Ast(tokenType.sub);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.sub);
    }

    if (!symtab_contain(tokenList[glWalk])) {
      parser_error(tokenList[glWalk]);
    }

    ast.right = new Ast(tokenType.id);
    ast.right.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.id);
  } else {
    if (!symtab_contain(tokenList[glWalk])) {
      parser_error(tokenList[glWalk]);
    }

    ast = new Ast(tokenType.id);
    ast.token = tokenList[glWalk];
    list_eat(tokenList[glWalk], tokenType.id);

    if (tokenList[glWalk].type === tokenType.add) {
      ast.left = new Ast(tokenType.add);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.add);

      ast.right = new Ast(tokenType.add);
      ast.right.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.add);
    } else {
      ast.left = new Ast(tokenType.sub);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.sub);

      ast.right = new Ast(tokenType.sub);
      ast.right.token = tokenList[glWalk];
      list_eat(tokenList[glWalk], tokenType.sub);
    }
  }

  return ast;
}

/**
 * semantic analysis of for statement
 * @arg {array} tokenList
 */
function holyc_parser_parse_for(tokenList) {
  let ast = new Ast(tokenType.for);
  ast.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.for);

  ast.next = new Ast(tokenType.rparen);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.rparen);

  if (is_dtype(tokenList[glWalk].type)) {
    ast.next.next = new Ast(tokenList[glWalk].type);
    ast.next.next.token = tokenList[glWalk];
    list_eat_type(tokenList[glWalk]);

    if (symtab_contain(tokenList[glWalk])) {
      parser_error(tokenList[glWalk]);
    }

    glSymTab.push(tokenList[glWalk]);
  }

  if (!symtab_contain(tokenList[glWalk])) {
    parser_error(tokenList[glWalk]);
  }

  ast.left = new Ast(tokenType.id);
  ast.left.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  ast.right = holyc_parser_parse_exp(tokenList);

  ast.left.left = new Ast(tokenType.semi);
  ast.left.left.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.semi);

  if (!symtab_contain(tokenList[glWalk])) {
    parser_error(tokenList[glWalk]);
  }

  ast.left.left.left = new Ast(tokenType.id);
  ast.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  ast.left.left.left.left = new Ast(tokenList[glWalk].type);
  ast.left.left.left.left.token = tokenList[glWalk];
  list_eat_logical(tokenList[glWalk]);

  ast.left.left.left.left.left = new Ast(tokenType.const);
  ast.left.left.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.const);

  ast.left.left.left.left.left.left = new Ast(tokenType.semi);
  ast.left.left.left.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.semi);

  ast.left.left.left.left.left.left.left =
    holyc_parser_parse_increment(tokenList);

  ast.left.left.left.left.left.left.left.next = new Ast(tokenType.lparen);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.lparen);

  ast.left.left.left.left.left.left.next = new Ast(tokenType.rbrace);
  ast.left.left.left.left.left.left.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.rbrace);

  ast.left.left.left.left.left.left.left.right =
    holyc_parser_parse_block(tokenList);

  ast.left.left.left.left.left.left.next.next = new Ast(tokenType.lbrace);
  ast.left.left.left.left.left.left.next.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.lbrace);

  return ast;
}

/**
 * @arg {array} tokenList
 */
function holyc_parser_parse(tokenList) {
  if (!tokenList[glWalk]) return null;

  let expList = new ExpList();

  ttype = tokenList[glWalk].type;

  switch (ttype) {
    case tokenType.i0:
    case tokenType.u0:
    case tokenType.i8:
    case tokenType.u8:
    case tokenType.i16:
    case tokenType.u16:
    case tokenType.i32:
    case tokenType.u32:
    case tokenType.i64:
    case tokenType.u64:
    case tokenType.f64:
    case tokenType.id:
      expList.ast = holyc_parser_parse_id(tokenList);
      break;
    case tokenType.str:
      expList.ast = holyc_parser_parse_str(tokenList);
      break;
    case tokenType.for:
      expList.ast = holyc_parser_parse_for(tokenList);
      break;
    default:
      parser_error(tokenList[glWalk]);
  }

  expList.next = holyc_parser_parse(tokenList);

  return expList;
}

/**
 * HolyC semantic analysis
 * @arg {array} tokenList
 */
function holyc_parser(tokenList) {
  glWalk = 0;
  glSymTab = [];
  console.log(glSymTab);
  return holyc_parser_parse(tokenList);
}

/**
 * printf function
 * @arg {number} val  - token value
 */
function printf(val) {
  let output = document.getElementById("output");
  output.value += val.replace(/\\n|\\t/g, (e) => {
    switch (e) {
      case "\\r":
      case "\\n":
        return "\n";
      case "\\t":
        return "\t";
      default:
        return e;
    }
  });
}

/**
 * code generation of identifiers
 * @arg {object} ast
 * @arg {array} expList
 */
function code_gen_gen_id(ast, expList) {
  if (!ast) return;
  if (ast.type === tokenType.lbrace) return ast;

  switch (ast.type) {
    case tokenType.call:
      code_gen_gen_id(code_gen_get_ast(expList, ast.token));
      break;
    case tokenType.str:
      printf(ast.token.value);
      break;
  }

  code_gen_gen_id(ast.next, expList);
  code_gen_gen_id(ast.left, expList);
  code_gen_gen_id(ast.right, expList);
}

/**
 * code generation check procedure ast
 * @arg {object} ast
 * @arg {object} id
 */
function code_gen_get_ast_check(ast, id) {
  if (ast.next.token.value === id.value) return true;
  return false;
}

/**
 * code generation get ast procedure
 * @arg {object} ast
 * @arg {object} id
 */
function code_gen_get_ast(expList, id) {
  if (!expList) return null;
  if (expList.ast.type != tokenType.call) {
    let ret = code_gen_get_ast_check(expList.ast, id);
    if (ret) return expList.ast;
  }
  return code_gen_get_ast(expList.next, id);
}

/**
 * code generation of blocks
 * @arg {object} walk
 * @arg {array} expList
 */
function code_gen_gen_block(walk, expList) {
  do {
    switch (walk.token.type) {
      case tokenType.for:
        code_gen_gen_for(walk);
        break;
      case tokenType.str:
        printf(walk.token.value);
        break;
      case tokenType.call:
        code_gen_gen_id(code_gen_get_ast(expList, walk.token), expList);
        break;
      default:
        break;
    }
    walk = walk.right;
  } while (walk);
}

/**
 * code generation of for statement
 * @arg {object} ast
 * @arg {array} expList
 */
function code_gen_gen_for(ast, expList) {
  let val = parseInt(ast.right.right.token.value);
  let cond = ast.left.left.left.left.token;
  let condVal = parseInt(ast.left.left.left.left.left.token.value);

  switch (cond.type) {
    case tokenType.less:
      for (let i = val; i < condVal; ++i) {
        code_gen_gen_block(
          ast.left.left.left.left.left.left.left.right,
          expList
        );
      }
      break;
    case tokenType.big:
      for (let i = val; i > condVal; ++i) {
        code_gen_gen_block(
          ast.left.left.left.left.left.left.left.right,
          expList
        );
      }
      break;
  }
}

/**
 * HolyC code generation
 * @arg {array} expList
 */
function code_gen(expList) {
  let expListAux = expList;

  while (expListAux) {
    switch (expListAux.ast.type) {
      case tokenType.for:
        code_gen_gen_for(expListAux.ast, expList);
        break;
      case tokenType.str:
        printf(expListAux.ast.token.value);
        break;
      case tokenType.call:
        code_gen_gen_id(
          code_gen_get_ast(expList, expListAux.ast.token),
          expList
        );
        break;
      default:
        break;
    }

    expListAux = expListAux.next;
  }
}

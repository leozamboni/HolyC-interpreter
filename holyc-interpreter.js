var version = "0.0.0";
document.getElementById(
  "output"
).value = `HolyC Interpreter version ${version}\n`;
document.getElementById("code").value = '"hello world";';

class Ast {
  token = null;
  next = null;
  left = null;
  right = null;
  constructor(type) {
    this.type = type;
  }
}

class ExpList {
  next = null;
  ast = null;
}

var glSymTab = [];
var glWalk;

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
};

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
    default:
      document.getElementById("code").value = "";
  }
};

var get_symtab = (token) => {
  for (let i = 0; i < glSymTab.length; ++i) {
    if (glSymTab[i].value === token.value) return i;
  }
};

var get_argsymtab = (ast, symtabNode, priorWalk, tokenList) => {
  if (ast.next.next.right) {
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
  }

  glSymTab.push(symtabNode);
};

var clear_output = () => {
  document.getElementById(
    "output"
  ).value = `HolyC Interpreter version ${version}\n`;
};

var is_alpha = (val) => {
  if (val === " " || val === "\n") return false;
  return /^[A-Z0-9]$/i.test(val);
};

var is_digit = (val) => {
  if (val === " " || val === "\n") return false;
  return !isNaN(val);
};

var lexer_error = (token) => {
  let output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error(
    (output.value += `lexer: '${token.value}' unexpected value in line ${token.line}\n`)
  );
};

var remove_tabs = (val) => {
  return val.replace(/\t/g, "");
};

var parser_error = (token) => {
  let output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error(
    (output.value += `parser: '${token.value}' unexpected value in line ${token.line}\n`)
  );
};

var list_eat = (token, expectedType) => {
  token?.type !== expectedType ? parser_error(token) : glWalk++;
};

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
  } else {
    return false;
  }
};

var list_eat_type = (token) => {
  is_dtype(token.type) ? glWalk++ : parser_error(token.value);
};

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

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.id,
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
      default:
        lexer_error({ value: input[i], line: line });
        break;
    }
  }
  console.log(tokenList);
  return tokenList;
}

function holyc_parser_parse_str(tokenList = []) {
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
  }
  return ast;
}

function holyc_parser_parse_block(tokenList = []) {
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

function holyc_parser_parse_call_args(tokenList = [], symIndex, i) {
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

function holyc_parser_parse_call(tokenList = []) {
  if (!glSymTab.filter((e) => e.value === tokenList[glWalk].value).length) {
    parser_error(tokenList[glWalk]);
  }

  let symIndex = get_symtab(tokenList[glWalk]);
  console.log(glSymTab[symIndex].args);

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

function holyc_parser_parse_id(tokenList = []) {
  if (tokenList[glWalk].type === tokenType.id) {
    return holyc_parser_parse_call(tokenList);
  }

  let ast = new Ast(tokenList[glWalk].type);
  ast.token = tokenList[glWalk];
  list_eat_type(tokenList[glWalk]);

  let symtabNode = tokenList[glWalk];

  ast.next = new Ast(tokenType.id);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.id);

  ast.next.next = new Ast(tokenType.rparen);
  ast.next.next.token = tokenList[glWalk];
  list_eat(tokenList[glWalk], tokenType.rparen);

  let priorWalk = glWalk;

  ast.next.next.right = holyc_parser_parse_args(tokenList);

  get_argsymtab(ast, symtabNode, priorWalk, tokenList);

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

  return ast;
}

function holyc_parser_parse(tokenList = []) {
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
    default:
      parser_error(tokenList[glWalk]);
  }

  expList.next = holyc_parser_parse(tokenList);

  return expList;
}

function holyc_parser(tokenList = []) {
  glWalk = 0;
  glSymTab = [];
  console.log(glSymTab);
  return holyc_parser_parse(tokenList);
}

function print_ast_node(ast) {
  if (!ast) return;
  console.log(ast.token, "\n");
  print_ast_node(ast.next);
  print_ast_node(ast.left);
  print_ast_node(ast.right);
}

function print_ast(expList) {
  if (!expList) return;
  print_ast_node(expList.ast);
  print_ast(expList.next);
}

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

function code_gen_gen_id(ast = [], expList) {
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

function code_gen_get_ast_check(ast, id) {
  if (ast.next.token.value === id.value) return true;
  return false;
}

function code_gen_get_ast(expList = [], id) {
  if (!expList) return null;
  if (expList.ast.type != tokenType.call) {
    let ret = code_gen_get_ast_check(expList.ast, id);
    if (ret) return expList.ast;
  }
  return code_gen_get_ast(expList.next, id);
}

function code_gen(expList = []) {
  let expListAux = expList;

  while (expListAux) {
    switch (expListAux.ast.type) {
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

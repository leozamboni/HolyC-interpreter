class Ast {
  token = {};
  next = null;
  left = null;
  right = null;
  constructor(type) {
    this.type = type;
  }
}

class ExpList {
  constructor(ast, next) {
    this.ast = ast;
    this.next = next;
  }
}

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
  u0: 11,
  i8: 12,
  u8: 13,
  i16: 14,
  u16: 15,
  i32: 16,
  u32: 17,
  i64: 18,
  u64: 19,
  f64: 20,
  rparen: 21,
  lparen: 22,
};

var globalIndexForTokenList;

var clearOutput = () => {
  document.getElementById("output").value = "HolyC Interpreter version 1.0.0\n";
};

var is_alpha = (val) => {
  if (val === " " || val === "\n") return false;
  return /^[A-Z0-9]$/i.test(val);
};

var is_digit = (val) => {
  if (val === " " || val === "\n") return false;
  return !isNaN(val);
};

var lexer_error = (val) => {
  var output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error((output.value += `lexer: '${val}' unexpected value\n`));
};

var remove_tabs = (val) => {
  return val.replace(/\t/g, "");
};

var parser_error = (val) => {
  var output = document.getElementById("output");
  output.value += "interpretation failure\n";
  throw new Error((output.value += `parser: '${val}' unexpected value\n`));
};

var list_eat = (token, expectedType) => {
  if (token.type !== expectedType) {
    parser_error(token.value);
  }
  globalIndexForTokenList++;
};

var list_eat_type = (token) => {
  if (
    token.type === tokenType.u0 ||
    token.type === tokenType.i8 ||
    token.type === tokenType.u8 ||
    token.type === tokenType.i16 ||
    token.type === tokenType.u16 ||
    token.type === tokenType.i32 ||
    token.type === tokenType.u32 ||
    token.type === tokenType.i64 ||
    token.type === tokenType.u64 ||
    token.type === tokenType.f64
  ) {
    globalIndexForTokenList++;
  } else {
    parser_error(token.value);
  }
};

var get_type = (val) => {
  switch (val) {
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
      console.log("ERROR");
  }
};

function holyc_lex_type(tokenList, line, input, i) {
  if (input[i] === "U" || input[i] === "I" || input[i] === "F") {
    if (input[i + 1] === "0" || input[i + 1] === "8") {
      if (input[i + 1] === "0" && input[i] !== "U") {
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
      default:
        lexer_error(input[i]);
        break;
    }
  }

  return tokenList;
}

function holyc_parser_parse_block(tokenList = []) {
  if (tokenList[globalIndexForTokenList].type === tokenType.semi) return null;

  var ast = new Ast(tokenList[globalIndexForTokenList].type);

  switch (tokenList[globalIndexForTokenList].type) {
    case tokenType.str:
      ast.token = tokenList[globalIndexForTokenList];
      list_eat(tokenList[globalIndexForTokenList], tokenType.str);
      break;
    default:
      parser_error(tokenList[globalIndexForTokenList].value);
  }

  ast.right = holyc_parser_parse_block(tokenList);

  return ast;
}

function holyc_parser_parse_procedure(tokenList = []) {
  ast = new Ast(tokenList[globalIndexForTokenList].type);
  ast.token = tokenList[globalIndexForTokenList];
  list_eat_type(tokenList[globalIndexForTokenList]);

  ast.next = new Ast(tokenType.id);
  ast.next.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.id);

  ast.next.next = new Ast(tokenType.rparen);
  ast.next.next.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.rparen);

  ast.next.next.next = new Ast(tokenType.lparen);
  ast.next.next.next.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.lparen);

  ast.left = new Ast(tokenType.rbrace);
  ast.left.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.rbrace);

  ast.right = holyc_parser_parse_block(tokenList);

  return ast;
}

function holyc_parser_parse(tokenList = []) {
  if (!tokenList[globalIndexForTokenList]) return null;
  expList = new ExpList();
  expList.ast = holyc_parser_parse_procedure(tokenList);
  //expList.next = holyc_parser_parse(tokenList);
  return expList;
}

function holyc_parser(tokenList = []) {
  globalIndexForTokenList = 0;
  expList = holyc_parser_parse(tokenList);
  return expList;
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

document.getElementById("code").addEventListener("keydown", function (e) {
  if (e.key == "Tab") {
    e.preventDefault();
    var start = this.selectionStart;
    var end = this.selectionEnd;

    // set textarea value to: text before caret + tab + text after caret
    this.value =
      this.value.substring(0, start) + "\t" + this.value.substring(end);

    // put caret at right position again
    this.selectionStart = this.selectionEnd = start + 1;
  }
});

function examples() {
  switch (document.getElementById("examples").value) {
    case "helloWorld":
      document.getElementById("code").value =
        'U0\nHello()\n{\n\t"Hello World\\n";\n}\n\nHello;';
      break;
    default:
      document.getElementById("code").value = "";
  }
}

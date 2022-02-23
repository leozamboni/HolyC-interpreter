class Ast {
  constructor(token, left, right, next) {
    this.token = token;
    this.next = next;
    this.left = left;
    this.right = right;
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
};

var is_alpha = (val) => {
  if (val === " " || val === "\n") return false;
  return /^[A-Z0-9]$/i.test(val);
};

var is_digit = (val) => {
  if (val === " " || val === "\n") return false;
  return !isNaN(val);
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
  var tokenList = [];
  var line = 1;

  for (let i = 0; i < input.length; ++i) {
    if (input[i] === "\n") line++;
    if (input[i] === " " || input[i] === "\n") continue;

    if (input[i] === '"') {
      let aux = "";

      i++;

      while (input[i] !== '"') {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.str,
      });
    }

    if (is_digit(input[i])) {
      let aux = "";

      while (is_digit(input[i])) {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.const,
      });
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
    }
  }
  console.log(tokenList);
  return tokenList;
}

var globalIndexForTokenList;

function list_eat(token, expectedType) {
  if (token.type !== expectedType) {
    throw new Error(`parser: ${token.value} unexpected value\n`);
  }
  globalIndexForTokenList++;
}

function list_eat_type(token) {
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
    throw new Error(`parser: ${token.value} unexpected value\n`);
  }
}

function holyc_parser_parse_procedure(tokenList = []) {
  ast = new Ast();
  ast.token = tokenList[globalIndexForTokenList];
  list_eat_type(tokenList[globalIndexForTokenList]);

  ast.next = new Ast();
  ast.next.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.id);

  ast.left = new Ast();
  ast.left.token = tokenList[globalIndexForTokenList];
  list_eat(tokenList[globalIndexForTokenList], tokenType.rbrace);

  if (tokenList[globalIndexForTokenList].type === tokenType.str) {
    console.log(tokenList[globalIndexForTokenList].value);

    ast.right = new Ast();
    ast.right.token = tokenList[globalIndexForTokenList];
    list_eat(tokenList[globalIndexForTokenList], tokenType.str);
  }

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

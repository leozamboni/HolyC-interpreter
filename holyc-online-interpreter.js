/**
 * @Copyright Leonardo Z. Nunes 2022
 * @license MIT
 * @fileoverview JS HolyC Interpreter
 * @version 0.0.0
 */

/**
 * Run interpreter in website
 */
const web_jsholyc_run = () => {
  alert(output(parser(lex(document.getElementById("stdin").value))));
};

/**
 * JS HolyC AST
 * @constructor
 */
class Ast {
  token;
  next;
  left;
  right;
  constructor(type) {
    this.type = type;
  }
}

/**
 * JS HolyC expression list
 * @constructor
 */
class ExpList {
  next;
  ast;
}

/**
 * alert output string
 * @global
 */
var outputstr;

/**
 * symbol table
 * @global
 */
var glSymTab;

/**
 * procedures prototypes
 * @global
 */
var glPrototypes;

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
const tokenType = {
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
  increment: 30,
  decrement: 31,
  assingsum: 32,
  assingsub: 33,
  assingdiv: 34,
  assingmul: 35,
  if: 36,
  or: 37,
  and: 38,
  not: 39,
  else: 40,
  true: 41,
  false: 42,
  equal: 43,
};

/**
 * get index of a symbol in symbol table
 */
const get_symtab = (token) => {
  for (let i = 0; i < glSymTab.length; ++i) {
    if (glSymTab[i].value === token.value) return i;
  }
};


/**
 * get index of prototype
 */
const get_prototype = (token) => {
  for (let i = 0; i < glPrototypes.length; ++i) {
    if (glPrototypes[i].id === token.value) return i;
  }
};

/**
 * check if value is alphanumeric
 * @arg {number} val - token value
 */
const is_alpha = (val) => {
  if (val === " " || val === "\n") return false;
  return /^[A-Z0-9_]$/i.test(val);
};

/**
 * check if value is alphanumeric
 * @arg {number} val - token value
 */
const is_digit = (val) => {
  if (val === " " || val === "\n") return false;
  return !isNaN(val);
};

/**
 * throw lexer error
 * @arg {object} token
 */
const lexer_error = (token) => {
  throw alert(
    `compile failure\nlexer: '${token.value}' unexpected value in line ${token.line}\n`
  );
};

/**
 * throw parser error
 * @arg {object} token
 */
const parser_error = (token) => {
  throw alert(
    `compile failure\nparser: '${token.value}' unexpected value in line ${token.line}\n`
  );
};

/**
 * remove tabulation from string
 * @arg {number} val - token value
 */
const remove_tabs = (val) => {
  return val.replace(/\t/g, "");
};

/**
 * check if symbol is in symbol table or not
 * @arg {array} tokenList
 * @arg {boolean} isin
 */
const check_symtab = (tokenList, isin) => {
  if (symtab_contain(tokenList[glWalk]) !== isin) {
    parser_error(tokenList[glWalk]);
  }
};

/**
 * throw parser error
 * @arg {array} tokenList
 * @arg {number} expectedType
 */
const list_eat = (tokenList, expectedType) => {
  try {
    if (tokenList[glWalk].type !== expectedType) {
      throw new Error();
    }
    glWalk++;
  } catch {
    parser_error(tokenList[glWalk] ? tokenList[glWalk] : tokenList[glWalk - 1]);
  }
};

/**
 * check if token is in symbol table
 * @arg {object} token
 */
const symtab_contain = (token) => {
  if (!glSymTab.filter((e) => e.value === token.value).length) {
    return false;
  }
  return true;
};

/**
 * check token type
 * @arg {array} tokenList
 * @arg {number} index
 * @arg {number} expectedType
 */
const check_token = (tokenList, index, expectedType) => {
  try {
    return tokenList[index].type === expectedType ? true : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * check ast type
 * @arg {number} type
 * @arg {string} expectedType
 */
const check_ast_type = (type, expectedType) => {
  switch (expectedType) {
    case "id":
      return type === tokenType.id ? true : false;
    case "data_type":
      return type === tokenType.i0 ||
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
        ? true
        : false;
    case "assignment_operator":
      return type === tokenType.assingdiv ||
        type === tokenType.assingmul ||
        type === tokenType.assingsub ||
        type === tokenType.assingsum
        ? true
        : false;
  }
};

/**
 * check if token type is a data type
 * @arg {array} tokenList
 * @arg {number} index
 */
const is_dtype = (tokenList, index) => {
  try {
    let type = tokenList[index].type;
    return type === tokenType.i0 ||
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
      ? true
      : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * check if token type is a logical operator
 * @arg {array} tokenList
 * @arg {number} index
 */
const is_logicalop = (tokenList, index) => {
  try {
    let type = tokenList[index].type;
    return type === tokenType.big ||
      type === tokenType.less ||
      type === tokenType.or ||
      type === tokenType.and ||
      type === tokenType.not ||
      type === tokenType.equal
      ? true
      : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * check if token type is a mathematical operator
 * @arg {array} tokenList
 * @arg {number} index
 */
const is_mathop = (tokenList, index) => {
  try {
    let type = tokenList[index].type;
    return type === tokenType.add ||
      type === tokenType.sub ||
      type === tokenType.div ||
      type === tokenType.mul ||
      type === tokenType.increment ||
      type === tokenType.decrement
      ? true
      : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * check if token type is a compound assignment operator
 * @arg {array} tokenList
 * @arg {number} index
 */
const is_assingop = (tokenList, index) => {
  try {
    let type = tokenList[index].type;
    return type === tokenType.assingdiv ||
      type === tokenType.assingmul ||
      type === tokenType.assingsub ||
      type === tokenType.assingsum ||
      type === tokenType.assig
      ? true
      : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * increment glWalk to next node in token list if token type is data type
 * @arg {array} tokenList
 */
const list_eat_type = (tokenList) => {
  is_dtype(tokenList, glWalk) ? glWalk++ : parser_error(tokenList[glWalk]);
};

/**
 * increment glWalk to next node in token list if token type is logical operator
 * @arg {array} tokenList
 */
const list_eat_logical = (tokenList) => {
  is_logicalop(tokenList, glWalk) ? glWalk++ : parser_error(tokenList[glWalk]);
};

/**
 * increment glWalk to next node in token list if token type is mathematical operator
 * @arg {array} tokenList
 */
const list_eat_math = (tokenList) => {
  is_mathop(tokenList, glWalk) ? glWalk++ : parser_error(tokenList[glWalk]);
};

/**
 * increment glWalk to next node in token list if token type is compound assignment operator
 * @arg {array} tokenList
 */
const list_eat_compassing = (tokenList) => {
  is_assingop(tokenList, glWalk) ? glWalk++ : parser_error(tokenList[glWalk]);
};

/**
 * lex data type
 * @arg {string} str - token
 */
const lex_type = (str) => {
  switch (str) {
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
      return null;
  }
};

/**
 * lex keyword
 * @arg {string} str - token
 */
const lex_keyword = (str) => {
  switch (str) {
    case "for":
      return tokenType.for;
    case "if":
      return tokenType.if;
    case "else":
      return tokenType.else;
    case "TRUE":
      return tokenType.true;
    case "FALSE":
      return tokenType.false;
    default:
      return tokenType.id;
  }
};

/**
 * JS HolyC lexer
 * @arg {string} input - input string
 */
const lex = (input) => {
  outputstr = "";
  if (!input) {
    throw alert("nothing to compile\n");
  }
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

      while (is_alpha(input[i])) {
        aux += input[i++];
      }
      i--;

      let type = lex_type(aux);

      if (!type) {
        type = lex_keyword(aux);
      }

      tokenList.push({
        value: aux,
        line: line,
        type: type,
      });

      continue;
    }

    switch (input[i]) {
      case "+": {
        if (input[i + 1] === "+") {
          i++;
          tokenList.push({
            value: "++",
            line: line,
            type: tokenType.increment,
          });
        } else if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            value: "+=",
            line: line,
            type: tokenType.assingsum,
          });
        } else {
          tokenList.push({
            value: "+",
            line: line,
            type: tokenType.add,
          });
        }
        break;
      }
      case "-":
        if (input[i + 1] === "-") {
          i++;
          tokenList.push({
            value: "--",
            line: line,
            type: tokenType.decrement,
          });
        } else if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            value: "-=",
            line: line,
            type: tokenType.assingsub,
          });
        } else {
          tokenList.push({
            value: "-",
            line: line,
            type: tokenType.sub,
          });
        }
        break;
      case "*":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            value: "*=",
            line: line,
            type: tokenType.assingmul,
          });
        } else {
          tokenList.push({
            value: "*",
            line: line,
            type: tokenType.mul,
          });
        }
        break;
      case "/":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            value: "/=",
            line: line,
            type: tokenType.assingdiv,
          });
        } else {
          tokenList.push({
            value: "/",
            line: line,
            type: tokenType.div,
          });
        }
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
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            value: "==",
            line: line,
            type: tokenType.equal,
          });
        } else {
          tokenList.push({
            value: "=",
            line: line,
            type: tokenType.assig,
          });
        }
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
      case "!":
        tokenList.push({
          value: "!",
          line: line,
          type: tokenType.not,
        });
        break;
      case "&":
        if (input[i + 1] === "&") {
          i++;
          tokenList.push({
            value: "&&",
            line: line,
            type: tokenType.and,
          });
        }
        break;
      case "|":
        if (input[i + 1] === "|") {
          i++;
          tokenList.push({
            value: "||",
            line: line,
            type: tokenType.or,
          });
        }
        break;

      default:
        lexer_error({ value: input[i], line: line });
        break;
    }
  }
  return tokenList;
};

/**
 * semantic analysis of logical expresions
 * @arg {array} tokenList
 */
const holyc_parser_parse_logical_exp = (tokenList) => {
  if (
    check_token(tokenList, glWalk, tokenType.semi) ||
    check_token(tokenList, glWalk, tokenType.comma) ||
    check_token(tokenList, glWalk, tokenType.lparen)
  )
    return null;

  let ast;

  if (
    check_token(tokenList, glWalk - 1, tokenType.id) ||
    check_token(tokenList, glWalk - 1, tokenType.const) ||
    check_token(tokenList, glWalk - 1, tokenType.true) ||
    check_token(tokenList, glWalk - 1, tokenType.false)
  ) {
    if (is_logicalop(tokenList, glWalk)) {
      ast = new Ast(tokenList[glWalk]?.type);
      ast.token = tokenList[glWalk];
      list_eat_logical(tokenList);
    } else {
      if (
        check_token(tokenList, glWalk - 1, tokenType.id) ||
        check_token(tokenList, glWalk - 1, tokenType.const)
      ) {
        if (is_mathop(tokenList, glWalk)) {
          if (
            check_token(tokenList, glWalk + 1, tokenType.id) ||
            check_token(tokenList, glWalk + 1, tokenType.const)
          ) {
            ast = new Ast(tokenList[glWalk]?.type);
            ast.token = tokenList[glWalk];
            list_eat_math(tokenList);
          }
        }
      }
    }
  } else if (is_logicalop(tokenList, glWalk - 1)) {
    if (check_token(tokenList, glWalk, tokenType.not)) {
      ast = new Ast(tokenType.not);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.not);
    } else if (check_token(tokenList, glWalk, tokenType.id)) {
      check_symtab(tokenList, true);

      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.id);
    } else if (check_token(tokenList, glWalk, tokenType.true)) {
      ast = new Ast(tokenType.true);
      ast.token = {
        value: 1,
        line: tokenList[glWalk].line,
        type: tokenType.const,
      };
      list_eat(tokenList, tokenType.true);
    } else if (check_token(tokenList, glWalk, tokenType.false)) {
      ast = new Ast(tokenType.const);
      ast.token = {
        value: 0,
        line: tokenList[glWalk].line,
        type: tokenType.const,
      };
      list_eat(tokenList, tokenType.false);
    } else {
      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (check_token(tokenList, glWalk, tokenType.id)) {
    check_symtab(tokenList, true);

    ast = new Ast(tokenType.id);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);
  } else if (check_token(tokenList, glWalk, tokenType.true)) {
    ast = new Ast(tokenType.true);
    ast.token = {
      value: 1,
      line: tokenList[glWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.true);
  } else if (check_token(tokenList, glWalk, tokenType.false)) {
    ast = new Ast(tokenType.const);
    ast.token = {
      value: 0,
      line: tokenList[glWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.false);
  } else {
    ast = new Ast(tokenType.const);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.const);
  }

  ast.right = holyc_parser_parse_logical_exp(tokenList);

  return ast;
};

/**
 * semantic analysis of expresions
 * @arg {array} tokenList
 */
const holyc_parser_parse_exp = (tokenList, arg) => {
  if (
    check_token(tokenList, glWalk, tokenType.semi) ||
    check_token(tokenList, glWalk, tokenType.comma) ||
    (arg && check_token(tokenList, glWalk, tokenType.lparen))
  )
    return null;

  let ast;

  if (
    check_token(tokenList, glWalk - 1, tokenType.id) ||
    check_token(tokenList, glWalk - 1, tokenType.const)
  ) {
    if (is_mathop(tokenList, glWalk)) {
      if (
        check_token(tokenList, glWalk + 1, tokenType.id) ||
        check_token(tokenList, glWalk + 1, tokenType.const)
      ) {
        ast = new Ast(tokenList[glWalk]?.type);
        ast.token = tokenList[glWalk];
        list_eat_math(tokenList);
      }
    } else if (is_assingop(tokenList, glWalk)) {
      ast = new Ast(tokenList[glWalk]?.type);
      ast.token = tokenList[glWalk];
      list_eat_compassing(tokenList);
    } else {
      ast = new Ast(tokenType.assig);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.assig);
    }
  } else if (
    check_token(tokenList, glWalk - 1, tokenType.assig) ||
    is_assingop(tokenList, glWalk - 1)
  ) {
    if (check_token(tokenList, glWalk, tokenType.id)) {
      check_symtab(tokenList, true);

      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.id);
    } else {
      glSymTab[get_symtab(tokenList[glWalk - 2])] = {
        value: tokenList[glWalk - 2].value,
        line: tokenList[glWalk - 2].line,
        const: tokenList[glWalk].value,
      };

      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (is_mathop(tokenList, glWalk - 1)) {
    if (check_token(tokenList, glWalk, tokenType.id)) {
      check_symtab(tokenList, true);

      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.id);
    } else {
      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (check_token(tokenList, glWalk, tokenType.id)) {
    check_symtab(tokenList, true);

    ast = new Ast(tokenType.id);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);
  } else if (!check_token(tokenList, glWalk, tokenType.semi)) {
    ast = new Ast(tokenType.comma);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);
  } else {
    parser_error(tokenList[glWalk]);
  }

  ast.right = holyc_parser_parse_exp(tokenList, arg);

  return ast;
};

/**
 * semantic analysis of string arguments
 * @arg {array} tokenList
 */
const holyc_parser_parse_str_args = (tokenList) => {
  if (check_token(tokenList, glWalk, tokenType.semi)) return null;

  let ast;

  if (
    check_token(tokenList, glWalk, tokenType.id) ||
    check_token(tokenList, glWalk, tokenType.const)
  ) {
    ast = new Ast(tokenList[glWalk]?.type);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenList[glWalk].type);
  } else if (check_token(tokenList, glWalk, tokenType.str)) {
    ast = new Ast(tokenType.str);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.str);
  } else {
    ast = holyc_parser_parse_exp(tokenList, false);
  }

  if (check_token(tokenList, glWalk, tokenType.assig)) {
    ast.left = new Ast(tokenType.assig);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.assig);

    ast.left.right = holyc_parser_parse_exp(tokenList, false);
  } else if (!check_token(tokenList, glWalk, tokenType.semi)) {
    ast.left = new Ast(tokenType.comma);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);
  }

  ast.right = holyc_parser_parse_str_args(tokenList);

  return ast;
};

/**
 * semantic analysis of inline strings
 * @arg {array} tokenList
 */
const holyc_parser_parse_inline_str = (tokenList) => {
  if (check_token(tokenList, glWalk, tokenType.semi)) return null;

  let ast = new Ast(tokenType.str);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.str);

  if (!check_token(tokenList, glWalk, tokenType.semi)) {
    ast.next = new Ast(tokenType.comma);
    ast.next.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);

    if (!check_token(tokenList, glWalk, tokenType.str)) {
      parser_error(tokenList[glWalk]);
    }
  }

  ast.right = holyc_parser_parse_inline_str(tokenList);

  return ast;
};

/**
 * semantic analysis of strings
 * @arg {array} tokenList
 */
const holyc_parser_parse_str = (tokenList) => {
  let symtabNode = tokenList[glWalk];

  let ast = new Ast(tokenType.str);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.str);

  if (check_token(tokenList, glWalk, tokenType.semi)) {
    ast.left = new Ast(tokenType.semi);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else {
    ast.left = new Ast(tokenType.comma);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);

    if (check_token(tokenList, glWalk, tokenType.str)) {
      ast.right = holyc_parser_parse_inline_str(tokenList);

      ast.left.left = new Ast(tokenType.semi);
      ast.left.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.semi);
    } else {
      let priorWalk = glWalk;

      ast.left.right = holyc_parser_parse_str_args(tokenList);

      set_argsymtab(symtabNode, priorWalk, tokenList);

      ast.left.left = new Ast(tokenType.semi);
      ast.left.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.semi);
    }
  }

  return ast;
};

/**
 * semantic analysis of blocks
 * @arg {array} tokenList
 */
const holyc_parser_parse_block = (tokenList) => {
  if (check_token(tokenList, glWalk, tokenType.lbrace)) return null;

  let ast;

  switch (tokenList[glWalk].type) {
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
      ast = holyc_parser_parse_id(tokenList);
      break;
    case tokenType.increment:
    case tokenType.decrement:
      ast = holyc_parser_parse_prepostfix(tokenList, false);
      break;
    case tokenType.str:
      ast = holyc_parser_parse_str(tokenList);
      break;
    case tokenType.for:
      ast = holyc_parser_parse_for(tokenList);
      break;
    case tokenType.if:
      ast = holyc_parser_parse_ifelse(tokenList);
      break;
    default:
      parser_error(tokenList[glWalk]);
  }

  ast.next = holyc_parser_parse_block(tokenList);

  return ast;
};

/**
 * semantic analysis of procedures arguments
 * @arg {array} tokenList
 */
const holyc_parser_parse_args = (tokenList = []) => {
  if (check_token(tokenList, glWalk, tokenType.lparen)) return null;

  let ast = new Ast(tokenList[glWalk]?.type);
  ast.token = tokenList[glWalk];
  list_eat_type(tokenList);

  ast.next = new Ast(tokenType.id);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, glWalk, tokenType.assig)) {
    ast.next.next = new Ast(tokenType.assig);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.assig);

    if (check_token(tokenList, glWalk, tokenType.const)) {
      ast.next.next.next = new Ast(tokenType.const);
      ast.next.next.next.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    } else {
      ast.next.next.next = new Ast(tokenType.str);
      ast.next.next.next.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.str);
    }
  }

  if (!check_token(tokenList, glWalk, tokenType.lparen)) {
    ast.next.next = new Ast(tokenType.comma);
    ast.next.next.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);
  }

  ast.right = holyc_parser_parse_args(tokenList);

  return ast;
};

/**
 * semantic analysis of procedures call arguments
 * @arg {array} tokenList
 * @arg {number} prototype
 * @arg {number} i - number of arguments
 */
const holyc_parser_parse_call_args = (tokenList, prototype, notAssigArgs, i) => {
  if (glPrototypes[prototype].args.length === i) return null;

  let ast;

  if (glPrototypes[prototype].args[i]?.value) {
    if (check_token(tokenList, glWalk, tokenType.id)) {

      check_symtab(tokenList, true);

      glPrototypes[prototype].args[i].value = glSymTab[get_symtab(tokenList[glWalk])].const;

      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.id);
    } else if (check_token(tokenList, glWalk, tokenType.const)) {

      glPrototypes[prototype].args[i].value = tokenList[glWalk].value;

      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else {
    if (check_token(tokenList, glWalk, tokenType.id)) {

      check_symtab(tokenList, true);

      glPrototypes[prototype].args[i].value = glSymTab[get_symtab(tokenList[glWalk])].const;

      ast = new Ast(tokenType.id);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.id);
    } else {

      glPrototypes[prototype].args[i].value = tokenList[glWalk].value;

      ast = new Ast(tokenType.const);
      ast.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.const);
    }
  }
  i++;
  if (i < glPrototypes[prototype].args.length) {
    if (ast) {
      ast.left = new Ast(tokenType.comma);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.comma);
    } else {
      if (notAssigArgs || check_token(tokenList, glWalk, tokenType.comma)) {
        ast = new Ast(tokenType.comma);
        ast.token = tokenList[glWalk];
        list_eat(tokenList, tokenType.comma);
      } else if (!notAssigArgs || check_token(tokenList, glWalk, tokenType.rparen)) {
        return null;
      }
    }
  } else {
    return null;
  }

  ast.right = holyc_parser_parse_call_args(tokenList, prototype, notAssigArgs, i);

  return ast;
};

/**
 * semantic analysis of procedures call
 * @arg {array} tokenList
 */
const holyc_parser_parse_call = (tokenList) => {
  check_symtab(tokenList, true);

  const prototype = get_prototype(tokenList[glWalk]);

  let ast = new Ast(tokenType.call);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  if (glPrototypes[prototype].args.length) {
    const notAssigArgs = glPrototypes[prototype].args.filter(e => e.value ? false : true).length

    if (check_token(tokenList, glWalk, tokenType.semi) && !notAssigArgs) {
      ast.left = new Ast(tokenType.semi);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.semi);

      return ast;
    }

    ast.left = new Ast(tokenType.rparen);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.rparen);

    if (check_token(tokenList, glWalk, tokenType.str) && !notAssigArgs && tokenList[glWalk].value === "*") {
      ast.left.left = new Ast(tokenType.str);
      ast.left.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.str);
    } else {
      if (glPrototypes[prototype].args.length) {
        ast.right = holyc_parser_parse_call_args(tokenList, prototype, notAssigArgs, 0);
      }
    }

    ast.left.left = new Ast(tokenType.lparen);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.lparen);

    ast.left.left.left = new Ast(tokenType.semi);
    ast.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, glWalk, tokenType.rparen)) {
    ast.left = new Ast(tokenType.rparen);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.rparen);

    ast.left.left = new Ast(tokenType.lparen);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.lparen);

    ast.left.left.left = new Ast(tokenType.semi);
    ast.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else {
    ast.left = new Ast(tokenType.semi);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  }

  return ast;
};

/**
 * semantic analysis of inline variables declaration
 * @arg {array} tokenList
 */
const holyc_parser_parse_inline_vars = (tokenList) => {
  if (
    check_token(tokenList, glWalk, tokenType.semi) &&
    !check_token(tokenList, glWalk - 1, tokenType.comma)
  )
    return null;

  check_symtab(tokenList, false);

  let symtabNode = tokenList[glWalk];

  let ast = new Ast(tokenType.id);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, glWalk, tokenType.assig)) {
    glSymTab.push({ ...symtabNode, const: 0 });

    ast.left = holyc_parser_parse_exp(tokenList, false);

    if (!check_token(tokenList, glWalk, tokenType.semi)) {
      ast.left.left = new Ast(tokenType.comma);
      ast.left.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.comma);
    }
  } else if (!check_token(tokenList, glWalk, tokenType.semi)) {
    glSymTab.push({ ...symtabNode, const: 0 });

    ast.left = new Ast(tokenType.comma);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);
  } else {
    glSymTab.push({ ...symtabNode, const: 0 });
  }

  ast.right = holyc_parser_parse_inline_vars(tokenList);

  return ast;
};

/**
 * semantic analysis of identifiers
 * @arg {array} tokenList
 */
const holyc_parser_parse_id = (tokenList) => {
  if (check_token(tokenList, glWalk, tokenType.id)) {
    if (is_assingop(tokenList, glWalk + 1)) {
      let ast = holyc_parser_parse_exp(tokenList, false);

      ast.left = new Ast(tokenType.semi);
      ast.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.semi);

      return ast;
    } else if (
      check_token(tokenList, glWalk + 1, tokenType.increment) ||
      check_token(tokenList, glWalk + 1, tokenType.decrement)
    ) {
      return holyc_parser_parse_prepostfix(tokenList, false);
    } else {
      return holyc_parser_parse_call(tokenList);
    }
  }

  let ast = new Ast(tokenList[glWalk]?.type);
  ast.token = tokenList[glWalk];
  list_eat_type(tokenList);

  check_symtab(tokenList, false);

  let symtabNode = tokenList[glWalk];

  ast.left = new Ast(tokenType.id);
  ast.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, glWalk, tokenType.semi)) {
    glSymTab.push({ ...symtabNode, const: 0 });

    ast.right = new Ast(tokenType.semi);
    ast.right.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, glWalk, tokenType.comma)) {
    glSymTab.push({ ...symtabNode, const: 0 });

    ast.left.left = new Ast(tokenType.comma);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.comma);

    ast.right = holyc_parser_parse_inline_vars(tokenList);

    ast.left.left.left = new Ast(tokenType.semi);
    ast.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, glWalk, tokenType.assig)) {
    glSymTab.push({ ...symtabNode, const: 0 });

    ast.right = holyc_parser_parse_exp(tokenList, false);

    if (check_token(tokenList, glWalk, tokenType.comma)) {
      ast.left.left = new Ast(tokenType.comma);
      ast.left.left.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.comma);

      ast.left.right = holyc_parser_parse_inline_vars(tokenList);
    }

    ast.right.left = new Ast(tokenType.semi);
    ast.right.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  } else {
    /**
     * parse procedures 
     */
    let prototype = {
      id: tokenList[glWalk - 1].value,
      type: tokenList[glWalk - 2].type,
      args: []
    }
    glSymTab.push({ ...tokenList[glWalk - 1], const: 0 });

    ast.left.left = new Ast(tokenType.rparen);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.rparen);

    let priorWalk = glWalk;

    ast.left.left.right = holyc_parser_parse_args(tokenList);

    let args = [];
    while (priorWalk < glWalk) {
      let argProt = {
        type: tokenList[priorWalk].type,
        id: tokenList[priorWalk + 1].value,
        value: 0,
      }
      if (tokenList[priorWalk + 2].type === tokenType.assig) {
        argProt.value = tokenList[priorWalk + 3].value;
        priorWalk += 2;
      }
      priorWalk += 2;
      if (tokenList[priorWalk].type === tokenType.comma) {
        priorWalk++;
      }
      args.push(argProt)
    }
    prototype.args = args;

    glPrototypes.push(prototype)

    ast.left.left.left = new Ast(tokenType.lparen);
    ast.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.lparen);

    ast.left.left.left.left = new Ast(tokenType.rbrace);
    ast.left.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.rbrace);

    ast.right = holyc_parser_parse_block(tokenList);

    ast.left.left.left.left.left = new Ast(tokenType.lbrace);
    ast.left.left.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.lbrace);
  }

  return ast;
};

/**
 * semantic analysis of variable with pre/post fix operator
 * @arg {array} tokenList
 * @arg {boolean} block
 */
const holyc_parser_parse_prepostfix = (tokenList, block) => {
  let ast;

  if (is_mathop(tokenList, glWalk)) {
    if (check_token(tokenList, glWalk, tokenType.increment)) {
      ast = new Ast(tokenType.increment);
      ast.token = tokenList[glWalk];
      list_eat_math(tokenList);
    } else {
      ast = new Ast(tokenType.decrement);
      ast.token = tokenList[glWalk];
      list_eat_math(tokenList);
    }

    check_symtab(tokenList, true);

    ast.right = new Ast(tokenType.id);
    ast.right.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);
  } else {
    check_symtab(tokenList, true);

    ast = new Ast(tokenType.id);
    ast.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);

    if (check_token(tokenList, glWalk, tokenType.increment)) {
      ast.right = new Ast(tokenType.increment);
      ast.right.token = tokenList[glWalk];
      list_eat_math(tokenList);
    } else {
      ast.right = new Ast(tokenType.decrement);
      ast.right.token = tokenList[glWalk];
      list_eat_math(tokenList);
    }
  }

  if (!block) {
    ast.left = new Ast(tokenType.semi);
    ast.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.semi);
  }

  return ast;
};

/**
 * semantic analysis of if else statement
 * @arg {array} tokenList
 */
const holyc_parser_parse_ifelse = (tokenList) => {
  let ast = new Ast(tokenType.if);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.if);

  ast.left = new Ast(tokenType.rparen);
  ast.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.rparen);

  if (check_token(tokenList, glWalk, tokenType.const)) {
    ast.left.left = new Ast(tokenType.const);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.const);
  } else if (check_token(tokenList, glWalk, tokenType.true)) {
    ast.left.left = new Ast(tokenType.true);
    ast.left.left.token = {
      value: 1,
      line: tokenList[glWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.true);
  } else if (check_token(tokenList, glWalk, tokenType.false)) {
    ast.left.left = new Ast(tokenType.const);
    ast.left.left.token = {
      value: 0,
      line: tokenList[glWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.false);
  } else {
    check_symtab(tokenList, true);

    ast.left.left = new Ast(tokenType.id);
    ast.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);
  }

  ast.right = holyc_parser_parse_logical_exp(tokenList);

  ast.left.left.left = new Ast(tokenType.lparen);
  ast.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.lparen);

  ast.left.left.next = new Ast(tokenType.rbrace);
  ast.left.left.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.rbrace);

  ast.left.left.left.right = holyc_parser_parse_block(tokenList);

  ast.left.left.next.next = new Ast(tokenType.lbrace);
  ast.left.left.next.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.lbrace);

  if (
    glWalk < tokenList.length &&
    check_token(tokenList, glWalk, tokenType.else)
  ) {
    ast.left.left.left.left = new Ast(tokenType.else);
    ast.left.left.left.left.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.else);

    if (check_token(tokenList, glWalk, tokenType.if)) {
      ast.left.left.left.next = holyc_parser_parse_ifelse(tokenList);
    } else {
      ast.left.left.left.next = new Ast(tokenType.rbrace);
      ast.left.left.left.next.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.rbrace);

      ast.left.left.left.left.right = holyc_parser_parse_block(tokenList);

      ast.left.left.left.next.next = new Ast(tokenType.lbrace);
      ast.left.left.left.next.next.token = tokenList[glWalk];
      list_eat(tokenList, tokenType.lbrace);
    }
  }

  return ast;
};

/**
 * semantic analysis of for statement
 * @arg {array} tokenList
 */
const holyc_parser_parse_for = (tokenList) => {
  let ast = new Ast(tokenType.for);
  ast.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.for);

  ast.next = new Ast(tokenType.rparen);
  ast.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.rparen);

  check_symtab(tokenList, true);

  ast.left = new Ast(tokenType.id);
  ast.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  ast.right = holyc_parser_parse_exp(tokenList, false);

  ast.left.left = new Ast(tokenType.semi);
  ast.left.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.semi);

  check_symtab(tokenList, true);

  ast.left.left.left = new Ast(tokenType.id);
  ast.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.id);

  ast.left.left.left.left = new Ast(tokenList[glWalk]?.type);
  ast.left.left.left.left.token = tokenList[glWalk];
  list_eat_logical(tokenList);

  ast.left.left.left.left.left = new Ast(tokenType.const);
  ast.left.left.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.const);

  ast.left.left.left.left.left.left = new Ast(tokenType.semi);
  ast.left.left.left.left.left.left.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.semi);

  if (
    check_token(tokenList, glWalk, tokenType.increment) ||
    check_token(tokenList, glWalk, tokenType.decrement) ||
    check_token(tokenList, glWalk + 1, tokenType.decrement) ||
    check_token(tokenList, glWalk + 1, tokenType.increment)
  ) {
    ast.left.left.left.left.left.left.left = holyc_parser_parse_prepostfix(
      tokenList,
      true
    );
  } else {
    check_symtab(tokenList, true);

    ast.left.left.left.left.left.left.next = new Ast(tokenType.id);
    ast.left.left.left.left.left.left.next.token = tokenList[glWalk];
    list_eat(tokenList, tokenType.id);

    ast.left.left.left.left.left.left.left = holyc_parser_parse_exp(
      tokenList,
      true
    );
  }

  ast.left.left.left.left.left.left.left.next = new Ast(tokenType.lparen);
  ast.left.left.left.left.left.left.left.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.lparen);

  ast.left.left.left.left.left.left.next = new Ast(tokenType.rbrace);
  ast.left.left.left.left.left.left.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.rbrace);

  ast.left.left.left.left.left.left.right = holyc_parser_parse_block(tokenList);

  ast.left.left.left.left.left.left.next.next = new Ast(tokenType.lbrace);
  ast.left.left.left.left.left.left.next.next.token = tokenList[glWalk];
  list_eat(tokenList, tokenType.lbrace);

  return ast;
};

/**
 * @arg {array} tokenList
 */
const holyc_parser_parse = (tokenList) => {
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
    case tokenType.increment:
    case tokenType.decrement:
      expList.ast = holyc_parser_parse_prepostfix(tokenList, false);
      break;
    case tokenType.str:
      expList.ast = holyc_parser_parse_str(tokenList);
      break;
    case tokenType.for:
      expList.ast = holyc_parser_parse_for(tokenList);
      break;
    case tokenType.if:
      expList.ast = holyc_parser_parse_ifelse(tokenList);
      break;
    default:
      console.log(tokenList[glWalk])
      parser_error(tokenList[glWalk]);
  }

  expList.next = holyc_parser_parse(tokenList);

  return expList;
};

/**
 * HolyC semantic analysis
 * @arg {array} tokenList
 */
const parser = (tokenList) => {
  glWalk = 0;
  glSymTab = [];
  glPrototypes = []

  return holyc_parser_parse(tokenList);
};

/**
 * printf function
 * @arg {object} ast
 */
const printf = (ast) => {
  let str = ast.token.value;

  if (ast.token.value.includes("%")) {
    str = str.replace("%d", glSymTab[get_symtab(ast.left.right.token)].const);
  }

  outputstr += str.replace(/\\n|\\t/g, (e) => {
    switch (e) {
      case "\\r":
      case "\\n":
        return "\n";
      case "\\t":
        return "    ";
      default:
        return e;
    }
  });
};

/**
 * code generation of mathematical expresions
 * @arg {object} ast
 */
const output_out_math_exp = (first, ast) => {
  let value = first;
  while (ast) {
    switch (ast.type) {
      case tokenType.div:
        if (ast.right.token.type === tokenType.const) {
          value /= parseInt(ast.right.token.value);
        } else {
          value /= parseInt(glSymTab[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.mul:
        if (ast.right.token.type === tokenType.const) {
          value *= parseInt(ast.right.token.value);
        } else {
          value *= parseInt(glSymTab[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.add:
        if (ast.right.token.type === tokenType.const) {
          value += parseInt(ast.right.token.value);
        } else {
          value += parseInt(glSymTab[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.sub:
        if (ast.right.token.type === tokenType.const) {
          value -= parseInt(ast.right.token.value);
        } else {
          value -= parseInt(glSymTab[get_symtab(ast.right.token)].const);
        }
        break;
    }
    if (ast?.right?.right) {
      ast = ast.right.right;
    } else {
      break;
    }
    if (
      ast.type !== tokenType.add &&
      ast.type !== tokenType.sub &&
      ast.type !== tokenType.div &&
      ast.type !== tokenType.mul
    ) {
      break;
    }
  }
  return value;
};

/**
 * code generation of logical expresions
 * @arg {object} ast
 * @arg {boolean} inside
 */
const output_out_logical_exp = (ast, inside) => {
  let first;
  let walk;
  let value = {
    number: 0,
    boolean: false,
  };

  if (!inside && ast.left.left.token.type === tokenType.not) {
    first = ast.right.token;
    walk = ast.right.right;
  } else if (!inside) {
    first = ast.left.left.token;
    walk = ast.right;
  } else if (inside && ast.right.token.type === tokenType.not) {
    first = ast.right.right.token;
    walk = ast.right.right.right;
  } else if (inside) {
    first = ast.right.token;
    walk = ast.right.right;
  }

  if (first.type === tokenType.id) {
    value.number = parseInt(glSymTab[get_symtab(first)].const);
  } else {
    value.number = parseInt(first.value);
  }

  if (
    walk?.token.type === tokenType.add ||
    walk?.token.type === tokenType.sub ||
    walk?.token.type === tokenType.div ||
    walk?.token.type === tokenType.mul
  ) {
    value.number = output_out_math_exp(value.number, walk);
    while (walk) {
      walk = walk.right;
      if (walk) {
        if (
          walk.token.type === tokenType.or ||
          walk.token.type === tokenType.and ||
          walk.token.type === tokenType.big ||
          walk.token.type === tokenType.less ||
          walk.token.type === tokenType.equal
        ) {
          break;
        }
      }
    }
  }

  if (value.number) {
    value.boolean = true;
  }

  let tokenValue;
  while (walk) {
    if (
      walk.right?.right?.token.type === tokenType.add ||
      walk.right?.right?.token.type === tokenType.sub ||
      walk.right?.right?.token.type === tokenType.div ||
      walk.right?.right?.token.type === tokenType.mul ||
      walk.right?.right?.token.type === tokenType.not
    ) {
      let mathFirst;
      if (walk.right.token.type === tokenType.id) {
        mathFirst = parseInt(glSymTab[get_symtab(walk.right.token)].const);
      } else {
        mathFirst = parseInt(walk.right.token.value);
      }
      tokenValue = output_out_math_exp(mathFirst, walk.right.right);
    } else if (walk.right.token.type === tokenType.id) {
      tokenValue = parseInt(glSymTab[get_symtab(walk.right.token)].const);
    } else if (walk.right.token.type === tokenType.const) {
      tokenValue = parseInt(walk.right.token.value);
    } else if (walk.right.token.type === tokenType.not) {
      if (walk.right.right.token.type === tokenType.id) {
        tokenValue = parseInt(
          glSymTab[get_symtab(walk.right.right.token)].const
        );
      } else if (walk.right.right.token.type === tokenType.const) {
        tokenValue = parseInt(walk.right.right.token.value);
      }
    }

    switch (walk.type) {
      case tokenType.less:
        value.boolean = value.number < tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case tokenType.big:
        value.boolean = value.number > tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case tokenType.or:
        const inside = output_out_logical_exp(walk, true);
        value.boolean = value.boolean || inside ? true : false;
        while (walk) {
          walk = walk.right;
          if (walk && walk.token.type === tokenType.or) break;
        }
        break;
      case tokenType.and:
        value.boolean = value.boolean && (tokenValue ? true : false);
        break;
      case tokenType.not:
        value.boolean = !value.boolean;
        break;
      case tokenType.equal:
        value.boolean = value.number === tokenValue ? true : false;
        break;
    }
    if (!walk) break;
    walk = walk.right.right;
    if (walk && walk?.token?.type === tokenType.not) {
      walk = walk.right;
    }
  }

  return value.boolean;
};

/**
 * code generation of expresions
 * @arg {object} ast
 * @arg {boolean} left
 */
const output_out_exp = (ast, left) => {
  let symTabI;
  if (check_ast_type(ast.token.type, "data_type")) {
    symTabI = get_symtab(ast.left.token);
  } else {
    symTabI = get_symtab(ast.token);
  }
  let value = parseInt(glSymTab[symTabI].const);
  let walk;
  if (left) {
    walk = ast.left;
  } else {
    walk = ast;
  }

  while (walk) {
    switch (walk.type) {
      case tokenType.div:
      case tokenType.assingdiv:
        if (walk.right.token.type === tokenType.const) {
          value /= parseInt(walk.right.token.value);
        } else {
          value /= parseInt(glSymTab[get_symtab(walk.right.token)].const);
        }
        glSymTab[symTabI].const = value;
        break;
      case tokenType.mul:
      case tokenType.assingmul:
        if (walk.right.token.type === tokenType.const) {
          value *= parseInt(walk.right.token.value);
        } else {
          value *= parseInt(glSymTab[get_symtab(walk.right.token)].const);
        }
        glSymTab[symTabI].const = value;
        break;
      case tokenType.assig:
        if (walk.right.token.type === tokenType.const) {
          value = parseInt(walk.right.token.value);
        } else {
          value = parseInt(glSymTab[get_symtab(walk.right.token)].const);
        }
        glSymTab[symTabI].const = value;
        break;
      case tokenType.assingsum:
      case tokenType.add:
        if (walk.right.token.type === tokenType.const) {
          value += parseInt(walk.right.token.value);
        } else {
          value += parseInt(glSymTab[get_symtab(walk.right.token)].const);
        }
        glSymTab[symTabI].const = value;
        break;
      case tokenType.assingsub:
      case tokenType.sub:
        if (walk.right.token.type === tokenType.const) {
          value -= parseInt(walk.right.token.value);
        } else {
          value -= parseInt(glSymTab[get_symtab(walk.right.token)].const);
        }
        glSymTab[symTabI].const = value;
        break;
    }
    walk = walk.right;
  }

  if (check_ast_type(ast?.left?.right?.token.type, "id")) {
    output_out_exp(ast.left.right, true);
  } else if (check_ast_type(ast?.right?.token.type, "id")) {
    output_out_exp(ast.right, true);
  }

  return walk;
};

/**
 * code generation of identifiers
 * @arg {object} ast
 * @arg {array} expList
 */
const output_out_call = (ast, expList) => {
  if (!ast) return;
  if (ast.type === tokenType.lbrace) return ast;

  switch (ast.type) {
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
      output_out_exp(ast, false);
      break;
    case tokenType.if:
      output_out_ifelse(ast, expList);
      break;
    case tokenType.for:
      output_out_for(ast);
      break;
    case tokenType.call:
      output_out_call(output_out_get_ast(expList, ast.token));
      break;
    case tokenType.str:
      printf(ast);
      break;
  }

  //output_out_call(ast.left, expList);
  output_out_call(ast.right, expList);
  output_out_call(ast.next, expList);
};

/**
 * code generation check procedure ast
 * @arg {object} ast
 * @arg {object} id
 */
const output_out_get_ast_check = (ast, id) => {
  if (ast.left.token.value === id.value) return true;
  return false;
};

/**
 * code generation get ast procedure
 * @arg {object} ast
 * @arg {object} id
 */
const output_out_get_ast = (expList, id) => {
  if (!expList) return null;
  if (check_ast_type(expList.ast.type, "data_type")) {
    let ret = output_out_get_ast_check(expList.ast, id);
    if (ret) {
      return expList.ast;
    }
  }
  return output_out_get_ast(expList.next, id);
};

/**
 * code generation of blocks
 * @arg {object} walk
 * @arg {array} expList
 */
const output_out_block = (walk, expList) => {
  if (!walk) return;

  switch (walk.token.type) {
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
      output_out_exp(walk, false);
      break;
    case tokenType.if:
      output_out_ifelse(walk, expList);
      break;
    case tokenType.for:
      output_out_for(walk);
      break;
    case tokenType.str:
      printf(walk);
      break;
    case tokenType.call:
      output_out_call(output_out_get_ast(expList, walk.token), expList);
      break;
    default:
      break;
  }

  output_out_block(walk.right, expList);
  output_out_block(walk.next, expList);
};

/**
 * code generation of if statement
 * @arg {object} ast
 */
const output_out_ifelse = (ast, expList) => {
  const logical = output_out_logical_exp(ast, false);

  let elseBlock;
  if (ast.left?.left?.left?.left) {
    elseBlock = ast.left.left.left.left.right;
  }

  if (logical) {
    output_out_block(ast.left.left.left.right, expList);
  } else if (elseBlock) {
    output_out_block(elseBlock, expList);
  }

  if (!logical && ast?.left?.left?.left?.next?.token.type === tokenType.if) {
    output_out_ifelse(ast.left.left.left.next, expList);
  }
};

/**
 * code generation of for statement
 * @arg {object} ast
 * @arg {array} expList
 */
const output_out_for = (ast, expList) => {
  const symTabI = get_symtab(ast.left.token);
  const val = parseInt(ast.right.right.token.value);
  const cond = ast.left.left.left.left.token;
  const condVal = parseInt(ast.left.left.left.left.left.token.value);
  let iterate = ast.left.left.left.left.left.left.left;

  if (iterate.type === tokenType.id) {
    iterate = ast.left.left.left.left.left.left.left.right;
  }

  let iterateValue;
  if (check_ast_type(iterate.type, "assignment_operator")) {
    iterateValue = parseInt(iterate.right.token.value);
  } else {
    iterateValue = 1;
  }

  switch (cond.type) {
    case tokenType.less:
      for (let i = val; i < condVal; i += iterateValue) {
        output_out_block(ast.left.left.left.left.left.left.right, expList);
        glSymTab[symTabI].const =
          parseInt(glSymTab[symTabI].const) + iterateValue;
      }
      break;
    case tokenType.big:
      for (let i = val; i > condVal; i += iterateValue) {
        output_out_block(ast.left.left.left.left.left.left.right, expList);
        glSymTab[symTabI].const =
          parseInt(glSymTab[symTabI].const) + iterateValue;
      }
      break;
  }
};

/**
 * HolyC code generation
 * @arg {array} expList
 */
const output = (expList) => {
  let expListAux = expList;

  do {
    switch (expListAux.ast.type) {
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
        output_out_exp(expListAux.ast, false);
        break;
      case tokenType.if:
        output_out_ifelse(expListAux.ast, expList);
        break;
      case tokenType.for:
        output_out_for(expListAux.ast, expList);
        break;
      case tokenType.str:
        let walk = expListAux.ast;
        do {
          printf(walk);
          walk = walk.right;
        } while (walk);
        break;
      case tokenType.call:
        output_out_call(
          output_out_get_ast(expList, expListAux.ast.token),
          expList
        );
        break;
      default:
        break;
    }

    expListAux = expListAux.next;
  } while (expListAux);

  return outputstr;
};

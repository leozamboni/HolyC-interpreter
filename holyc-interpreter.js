/**
 * @Copyright Leonardo Z. Nunes 2022
 * @license MIT
 * @fileoverview JS HolyC Interpreter
 * @version 0.0.0
 */
/*
How the interpreter works:            
                               +--------+
                               | stdin  |
                               +---+----+
                                   |
                               +---v----+
                  +------------+ lexer  | // Lex input and create a token list;
+---------+  +----v--------+   +---+----+
| stderr  <--+error handler|       | 
+---------+  +----^--------+   +---v----+
                  +------------+ parser | // Token list iteration and AST generate;
                               +---+----+
                                   |
                               +---v----+
                               | output | // Run AST and return stdout.
                               +---+----+
                                   |
                               +---v----+
                               | stdout | 
                               +--------+
*/

/**
 * Run interpreter in web front-end
 * @requires
 * @description 
 * Make sure you have a input tag with "stdin" id in your HTML DOM;
 * You can call this procedure for run the stdin with a button, for example:
 * 
 *  <button onclick="holyc_run()">RUN(▶)</button>
 * 
 * After run the stdout will appear in the alert box in your site, 
 * so make sure you have it enabled in your browser. 
 */
const holyc_run = () => {
  alert(output(parser(lex(document.getElementById("stdin").value))));
};

/**
 * Back-end runtime 
 * @arg {string} stdin
 * @requires
 * @description 
 * This procedure is only for holy node (the CLI JS HolyC interpreter for back-ends);
 * Check github.com/leozamboni/holy-node
 */
const cli_runtime = (stdin) => {
  console.log(output(parser(lex(stdin))));
}

/**
 * AST Node
 * @constructor
 * @param {{
 *  token: AstNode, 
 *  next: AstNode, 
 *  left: AstNode, 
 *  right: AstNode,
 *  type: tokenType, 
 * }}
 */
class AstNode {
  token;
  next;
  left;
  right;
  constructor(type) {
    this.type = type;
  }
}

/**
 * AST
 * @constructor
 * @param {{
 *  next: AstNode, 
 *  ast: AstNode, 
 * }}
 */
class Ast {
  next;
  ast;
}

/**
 * symbol table
 * @global
 * @param {{
 *  id: string, 
 *  line: number, 
 *  type: tokenType 
 * }} token
 */
var symbolTable;

/**
 * alert output string
 * @global
 * @type {string}
 */
var stdout;

/**
 * procedures prototypes
 * @global
 * @param {{
 *  id: string, 
 *  line: number, 
 *  type: tokenType,
 *  value: number | string | boolean, 
 * }} prototype
 */
var proceduresPrototypes;

/**
 * index for token list iteration
 * @global
 * @type {number}
 */
var tokenListIndexWalk;

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
  return: 44,
  bigequal: 45,
  lessequal: 46,
};

/**
 * get index of a symbol in symbol table
 */
const get_symtab = (token) => {
  for (let i = 0; i < symbolTable.length; ++i) {
    if (symbolTable[i].id === token.id) return i;
  }
};


/**
 * get index of prototype
 */
const get_prototype = (token) => {
  for (let i = 0; i < proceduresPrototypes.length; ++i) {
    if (proceduresPrototypes[i].id === token.id) return i;
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
  const stderr = `compile failure\nlexer: '${token.id}' unexpected token in line ${token.line}\n`;
  try {
    throw alert(stderr);
  } catch {
    throw new Error(stderr)
  }
};

/**
 * throw parser error
 * @arg {object} token
 */
const parser_error = (token) => {
  const stderr = `compile failure\nparser: '${token.id}' unexpected token in line ${token.line}\n`;
  try {
    throw alert(stderr);
  } catch {
    throw new Error(stderr)
  }
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
  if (symtab_contain(tokenList[tokenListIndexWalk]) !== isin) {
    parser_error(tokenList[tokenListIndexWalk]);
  }
};

/**
 * throw parser error
 * @arg {array} tokenList
 * @arg {number} expectedType
 */
const list_eat = (tokenList, expectedType) => {
  try {
    if (tokenList[tokenListIndexWalk].type !== expectedType) {
      throw new Error();
    }
    tokenListIndexWalk++;
  } catch {
    parser_error(tokenList[tokenListIndexWalk] ? tokenList[tokenListIndexWalk] : tokenList[tokenListIndexWalk - 1]);
  }
};

/**
 * check if token is in symbol table
 * @arg {object} token
 */
const symtab_contain = (token) => {
  if (symbolTable.filter((e) => e.id === token.id).length) {
    return true;
  }
  return false;
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
 * increment tokenListIndexWalk to next node in token list if token type is data type
 * @arg {array} tokenList
 */
const list_eat_type = (tokenList) => {
  is_dtype(tokenList, tokenListIndexWalk) ? tokenListIndexWalk++ : parser_error(tokenList[tokenListIndexWalk]);
};

/**
 * increment tokenListIndexWalk to next node in token list if token type is logical operator
 * @arg {array} tokenList
 */
const list_eat_logical = (tokenList) => {
  is_logicalop(tokenList, tokenListIndexWalk) ? tokenListIndexWalk++ : parser_error(tokenList[tokenListIndexWalk]);
};

/**
 * increment tokenListIndexWalk to next node in token list if token type is mathematical operator
 * @arg {array} tokenList
 */
const list_eat_math = (tokenList) => {
  is_mathop(tokenList, tokenListIndexWalk) ? tokenListIndexWalk++ : parser_error(tokenList[tokenListIndexWalk]);
};

/**
 * increment tokenListIndexWalk to next node in token list if token type is compound assignment operator
 * @arg {array} tokenList
 */
const list_eat_compassing = (tokenList) => {
  is_assingop(tokenList, tokenListIndexWalk) ? tokenListIndexWalk++ : parser_error(tokenList[tokenListIndexWalk]);
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
    case "return":
      return tokenType.return;
    case "TRUE":
      return tokenType.true;
    case "FALSE":
      return tokenType.false;
    default:
      return tokenType.id;
  }
};

/**
 * lexer
 * @arg {string} input - input string
 */
const lex = (input) => {
  stdout = "";
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
        id: aux,
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
        id: aux,
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
        id: aux,
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
        id: aux,
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
            id: "++",
            line: line,
            type: tokenType.increment,
          });
        } else if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "+=",
            line: line,
            type: tokenType.assingsum,
          });
        } else {
          tokenList.push({
            id: "+",
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
            id: "--",
            line: line,
            type: tokenType.decrement,
          });
        } else if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "-=",
            line: line,
            type: tokenType.assingsub,
          });
        } else {
          tokenList.push({
            id: "-",
            line: line,
            type: tokenType.sub,
          });
        }
        break;
      case "*":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "*=",
            line: line,
            type: tokenType.assingmul,
          });
        } else {
          tokenList.push({
            id: "*",
            line: line,
            type: tokenType.mul,
          });
        }
        break;
      case "/":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "/=",
            line: line,
            type: tokenType.assingdiv,
          });
        } else {
          tokenList.push({
            id: "/",
            line: line,
            type: tokenType.div,
          });
        }
        break;
      case ";":
        tokenList.push({
          id: ";",
          line: line,
          type: tokenType.semi,
        });
        break;
      case "{":
        tokenList.push({
          id: "{",
          line: line,
          type: tokenType.rbrace,
        });
        break;
      case "}":
        tokenList.push({
          id: "}",
          line: line,
          type: tokenType.lbrace,
        });
        break;
      case "(":
        tokenList.push({
          id: "(",
          line: line,
          type: tokenType.rparen,
        });
        break;
      case ")":
        tokenList.push({
          id: ")",
          line: line,
          type: tokenType.lparen,
        });
        break;
      case ",":
        tokenList.push({
          id: ",",
          line: line,
          type: tokenType.comma,
        });
        break;
      case "=":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "==",
            line: line,
            type: tokenType.equal,
          });
        } else {
          tokenList.push({
            id: "=",
            line: line,
            type: tokenType.assig,
          });
        }
        break;
      case "<":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: "<=",
            line: line,
            type: tokenType.lessequal,
          });
        } else {
          tokenList.push({
            id: "<",
            line: line,
            type: tokenType.less,
          });
        }
        break;
      case ">":
        if (input[i + 1] === "=") {
          i++;
          tokenList.push({
            id: ">=",
            line: line,
            type: tokenType.bigequal,
          });
        } else {
          tokenList.push({
            id: ">",
            line: line,
            type: tokenType.big,
          });
        }
        break;
      case "!":
        tokenList.push({
          id: "!",
          line: line,
          type: tokenType.not,
        });
        break;
      case "&":
        if (input[i + 1] === "&") {
          i++;
          tokenList.push({
            id: "&&",
            line: line,
            type: tokenType.and,
          });
        }
        break;
      case "|":
        if (input[i + 1] === "|") {
          i++;
          tokenList.push({
            id: "||",
            line: line,
            type: tokenType.or,
          });
        }
        break;

      default:
        lexer_error({ id: input[i], line: line });
        break;
    }
  }
  return tokenList;
};

/**
 * semantic analysis of logical expresions
 * @arg {array} tokenList
 */
const parser_parse_logical_exp = (tokenList) => {
  if (
    check_token(tokenList, tokenListIndexWalk, tokenType.semi) ||
    check_token(tokenList, tokenListIndexWalk, tokenType.comma) ||
    check_token(tokenList, tokenListIndexWalk, tokenType.lparen)
  )
    return null;

  let ast;

  if (
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.id) ||
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.const) ||
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.true) ||
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.false)
  ) {
    if (is_logicalop(tokenList, tokenListIndexWalk)) {
      ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat_logical(tokenList);
    } else {
      if (
        check_token(tokenList, tokenListIndexWalk - 1, tokenType.id) ||
        check_token(tokenList, tokenListIndexWalk - 1, tokenType.const)
      ) {
        if (is_mathop(tokenList, tokenListIndexWalk)) {
          if (
            check_token(tokenList, tokenListIndexWalk + 1, tokenType.id) ||
            check_token(tokenList, tokenListIndexWalk + 1, tokenType.const)
          ) {
            ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
            ast.token = tokenList[tokenListIndexWalk];
            list_eat_math(tokenList);
          }
        }
      }
    }
  } else if (is_logicalop(tokenList, tokenListIndexWalk - 1)) {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.not)) {
      ast = new AstNode(tokenType.not);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.not);
    } else if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
      check_symtab(tokenList, true);

      ast = new AstNode(tokenType.id);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.id);
    } else if (check_token(tokenList, tokenListIndexWalk, tokenType.true)) {
      ast = new AstNode(tokenType.true);
      ast.token = {
        id: 1,
        line: tokenList[tokenListIndexWalk].line,
        type: tokenType.const,
      };
      list_eat(tokenList, tokenType.true);
    } else if (check_token(tokenList, tokenListIndexWalk, tokenType.false)) {
      ast = new AstNode(tokenType.const);
      ast.token = {
        id: 0,
        line: tokenList[tokenListIndexWalk].line,
        type: tokenType.const,
      };
      list_eat(tokenList, tokenType.false);
    } else {
      ast = new AstNode(tokenType.const);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
    check_symtab(tokenList, true);

    ast = new AstNode(tokenType.id);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.true)) {
    ast = new AstNode(tokenType.true);
    ast.token = {
      id: 1,
      line: tokenList[tokenListIndexWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.true);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.false)) {
    ast = new AstNode(tokenType.const);
    ast.token = {
      id: 0,
      line: tokenList[tokenListIndexWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.false);
  } else {
    ast = new AstNode(tokenType.const);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.const);
  }

  ast.right = parser_parse_logical_exp(tokenList);

  return ast;
};

/**
 * semantic analysis of expresions
 * @arg {array} tokenList
 */
const parser_parse_exp = (tokenList, arg, prototypeIndex) => {
  if (
    check_token(tokenList, tokenListIndexWalk, tokenType.semi) ||
    check_token(tokenList, tokenListIndexWalk, tokenType.comma) ||
    (arg && check_token(tokenList, tokenListIndexWalk, tokenType.lparen))
  )
    return null;

  let ast;

  if (proceduresPrototypes.find(e => e.id === tokenList[tokenListIndexWalk].id)) {
    return parser_parse_call(tokenList)
  } else if (
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.id) ||
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.const)
  ) {
    if (is_mathop(tokenList, tokenListIndexWalk)) {
      if (
        check_token(tokenList, tokenListIndexWalk + 1, tokenType.id) ||
        check_token(tokenList, tokenListIndexWalk + 1, tokenType.const)
      ) {
        ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
        ast.token = tokenList[tokenListIndexWalk];
        list_eat_math(tokenList);
      }
    } else if (is_assingop(tokenList, tokenListIndexWalk)) {
      ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat_compassing(tokenList);
    } else {
      ast = new AstNode(tokenType.assig);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.assig);
    }
  } else if (
    check_token(tokenList, tokenListIndexWalk - 1, tokenType.assig) ||
    is_assingop(tokenList, tokenListIndexWalk - 1)
  ) {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
      let procedureArg;
      if (prototypeIndex) {
        procedureArg = proceduresPrototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[tokenListIndexWalk].id)
      } else {
        procedureArg = proceduresPrototypes.find(e => e.id === tokenList[tokenListIndexWalk].id)
      }
      !procedureArg && check_symtab(tokenList, true);

      ast = new AstNode(tokenType.id);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.id);
    } else {
      symbolTable[get_symtab(tokenList[tokenListIndexWalk - 2])] = {
        id: tokenList[tokenListIndexWalk - 2].id,
        line: tokenList[tokenListIndexWalk - 2].line,
        value: tokenList[tokenListIndexWalk].id,
      };

      ast = new AstNode(tokenType.const);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (is_mathop(tokenList, tokenListIndexWalk - 1) || check_token(tokenList, tokenListIndexWalk - 1, tokenType.return)) {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
      let procedureArg;
      prototypeIndex && (procedureArg = proceduresPrototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[tokenListIndexWalk].id))
      !procedureArg && check_symtab(tokenList, true);

      ast = new AstNode(tokenType.id);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.id);
    } else {
      ast = new AstNode(tokenType.const);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
    let procedureArg;
    prototypeIndex && (procedureArg = proceduresPrototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[tokenListIndexWalk].id))
    !procedureArg && check_symtab(tokenList, true);

    ast = new AstNode(tokenType.id);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);
  } else if (!check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    ast = new AstNode(tokenType.comma);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);
  } else {
    parser_error(tokenList[tokenListIndexWalk]);
  }

  ast.right = parser_parse_exp(tokenList, arg, prototypeIndex);

  return ast;
};

/**
 * semantic analysis of string arguments
 * @arg {array} tokenList
 */
const parser_parse_str_args = (tokenList) => {
  if (check_token(tokenList, tokenListIndexWalk, tokenType.semi)) return null;

  let ast;

  if (
    check_token(tokenList, tokenListIndexWalk, tokenType.id) ||
    check_token(tokenList, tokenListIndexWalk, tokenType.const)
  ) {
    ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenList[tokenListIndexWalk].type);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.str)) {
    ast = new AstNode(tokenType.str);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.str);
  } else {
    ast = parser_parse_exp(tokenList, false);
  }

  if (check_token(tokenList, tokenListIndexWalk, tokenType.assig)) {
    ast.left = new AstNode(tokenType.assig);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.assig);

    ast.left.right = parser_parse_exp(tokenList, false);
  } else if (!check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    ast.left = new AstNode(tokenType.comma);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);
  }

  ast.right = parser_parse_str_args(tokenList);

  return ast;
};

/**
 * semantic analysis of inline strings
 * @arg {array} tokenList
 */
const parser_parse_inline_str = (tokenList) => {
  if (check_token(tokenList, tokenListIndexWalk, tokenType.semi)) return null;

  let ast = new AstNode(tokenType.str);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.str);

  if (!check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    ast.next = new AstNode(tokenType.comma);
    ast.next.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);

    if (!check_token(tokenList, tokenListIndexWalk, tokenType.str)) {
      parser_error(tokenList[tokenListIndexWalk]);
    }
  }

  ast.right = parser_parse_inline_str(tokenList);

  return ast;
};

/**
 * semantic analysis of procedure return
 * @arg {array} tokenList
 */
const parser_parse_return = (tokenList, prototypeIndex) => {
  let ast = new AstNode(tokenType.return);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.return);

  ast.right = parser_parse_exp(tokenList, false, prototypeIndex)

  ast.left = new AstNode(tokenType.semi);
  ast.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.semi);

  return ast;
};

/**
 * semantic analysis of strings
 * @arg {array} tokenList
 */
const parser_parse_str = (tokenList) => {
  //let symtabNode = tokenList[tokenListIndexWalk];

  let ast = new AstNode(tokenType.str);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.str);

  if (check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    ast.left = new AstNode(tokenType.semi);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.semi);
  } else {
    ast.left = new AstNode(tokenType.comma);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.str)) {
      ast.right = parser_parse_inline_str(tokenList);

      ast.left.left = new AstNode(tokenType.semi);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);
    } else {
      //let priorWalk = tokenListIndexWalk;

      ast.left.right = parser_parse_str_args(tokenList);

      //set_argsymtab(symtabNode, priorWalk, tokenList);

      ast.left.left = new AstNode(tokenType.semi);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);
    }
  }

  return ast;
};

/**
 * semantic analysis of blocks
 * @arg {array} tokenList
 */
const parser_parse_block = (tokenList, prototypeIndex) => {
  if (check_token(tokenList, tokenListIndexWalk, tokenType.lbrace)) return null;

  let ast;

  switch (tokenList[tokenListIndexWalk].type) {
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
      ast = parser_parse_id(tokenList, prototypeIndex);
      break;
    case tokenType.increment:
    case tokenType.decrement:
      ast = parser_parse_prepostfix(tokenList, false);
      break;
    case tokenType.str:
      ast = parser_parse_str(tokenList);
      break;
    case tokenType.for:
      ast = parser_parse_for(tokenList);
      break;
    case tokenType.if:
      ast = parser_parse_ifelse(tokenList);
      break;
    case tokenType.return:
      ast = parser_parse_return(tokenList, prototypeIndex);
      break;
    default:
      parser_error(tokenList[tokenListIndexWalk]);
  }

  ast.next = parser_parse_block(tokenList, prototypeIndex);

  return ast;
};

/**
 * semantic analysis of procedures arguments
 * @arg {array} tokenList
 */
const parser_parse_args = (tokenList = []) => {
  if (check_token(tokenList, tokenListIndexWalk, tokenType.lparen)) return null;

  let ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat_type(tokenList);

  ast.next = new AstNode(tokenType.id);
  ast.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, tokenListIndexWalk, tokenType.assig)) {
    ast.next.next = new AstNode(tokenType.assig);
    ast.next.next.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.assig);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.const)) {
      ast.next.next.next = new AstNode(tokenType.const);
      ast.next.next.next.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    } else {
      ast.next.next.next = new AstNode(tokenType.str);
      ast.next.next.next.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.str);
    }
  }

  if (!check_token(tokenList, tokenListIndexWalk, tokenType.lparen)) {
    ast.next.next = new AstNode(tokenType.comma);
    ast.next.next.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);
  }

  ast.right = parser_parse_args(tokenList);

  return ast;
};

/**
 * semantic analysis of procedures call arguments
 * @arg {array} tokenList
 * @arg {number} prototype
 * @arg {number} i - number of arguments
 */
const parser_parse_call_args = (tokenList, prototype, notAssigArgs, i) => {
  if (proceduresPrototypes[prototype].args.length === i) return null;

  let ast;

  if (proceduresPrototypes[prototype].args[i]?.id) {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {

      check_symtab(tokenList, true);

      //proceduresPrototypes[prototype].args[i].value = symbolTable[get_symtab(tokenList[tokenListIndexWalk])].const;

      ast = new AstNode(tokenType.id);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.id);

      if (is_mathop(tokenList, tokenListIndexWalk)) ast

    } else if (check_token(tokenList, tokenListIndexWalk, tokenType.const)) {

      //proceduresPrototypes[prototype].args[i].value = tokenList[tokenListIndexWalk].value;

      ast = new AstNode(tokenType.const);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    }
  } else {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {

      check_symtab(tokenList, true);

      //proceduresPrototypes[prototype].args[i].value = symbolTable[get_symtab(tokenList[tokenListIndexWalk])].const;

      ast = new AstNode(tokenType.id);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.id);
    } else {

      //proceduresPrototypes[prototype].args[i].value = tokenList[tokenListIndexWalk].value;

      ast = new AstNode(tokenType.const);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.const);
    }
  }

  if (i < proceduresPrototypes[prototype].args.length - 1) {
    if (ast) {
      if (check_token(tokenList, tokenListIndexWalk, tokenType.comma)) {
        ast.left = new AstNode(tokenType.comma);
        ast.left.token = tokenList[tokenListIndexWalk];
        list_eat(tokenList, tokenType.comma);
      } else {
        return ast;
      }
    } else {
      if (notAssigArgs || check_token(tokenList, tokenListIndexWalk, tokenType.comma)) {
        ast = new AstNode(tokenType.comma);
        ast.token = tokenList[tokenListIndexWalk];
        list_eat(tokenList, tokenType.comma);
      } else if (!notAssigArgs || check_token(tokenList, tokenListIndexWalk, tokenType.rparen)) {
        return ast;
      }
    }
  } else {
    return ast;
  }

  ast.right = parser_parse_call_args(tokenList, prototype, notAssigArgs, ++i);

  return ast;
};

/**
 * semantic analysis of procedures call
 * @arg {array} tokenList
 */
const parser_parse_call = (tokenList) => {
  if (proceduresPrototypes.findIndex(e => e.id === tokenList[tokenListIndexWalk].id) < 0) {
    check_symtab(tokenList, true);
  }

  const prototype = get_prototype(tokenList[tokenListIndexWalk]);

  let ast = new AstNode(tokenType.call);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  if (proceduresPrototypes[prototype].args.length) {
    const notAssigArgs = proceduresPrototypes[prototype].args.filter(e => { return e.id === undefined ? true : false }).length

    if (check_token(tokenList, tokenListIndexWalk, tokenType.semi) && !notAssigArgs) {
      ast.left = new AstNode(tokenType.semi);
      ast.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);

      return ast;
    }

    ast.left = new AstNode(tokenType.rparen);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.rparen);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.str) && !notAssigArgs && tokenList[tokenListIndexWalk].id === "*") {
      ast.left.left = new AstNode(tokenType.str);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.str);
    } else {
      if (proceduresPrototypes[prototype].args.length) {
        ast.right = parser_parse_call_args(tokenList, prototype, notAssigArgs, 0);
      }
    }

    ast.left.left = new AstNode(tokenType.lparen);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.lparen);

    // ast.left.left.left = new AstNode(tokenType.semi);
    // ast.left.left.left.token = tokenList[tokenListIndexWalk];
    // list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.rparen)) {
    ast.left = new AstNode(tokenType.rparen);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.rparen);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.str) && tokenList[tokenListIndexWalk].id === "*") {
      ast.left.next = new AstNode(tokenType.str);
      ast.left.next.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.str);
    }

    ast.left.left = new AstNode(tokenType.lparen);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.lparen);

    // ast.left.left.left = new AstNode(tokenType.semi);
    // ast.left.left.left.token = tokenList[tokenListIndexWalk];
    // list_eat(tokenList, tokenType.semi);
  } else {
    // ast.left = new AstNode(tokenType.semi);
    // ast.left.token = tokenList[tokenListIndexWalk];
    // list_eat(tokenList, tokenType.semi);
  }

  return ast;
};

/**
 * semantic analysis of inline variables declaration
 * @arg {array} tokenList
 */
const parser_parse_inline_vars = (tokenList) => {
  if (
    check_token(tokenList, tokenListIndexWalk, tokenType.semi) &&
    !check_token(tokenList, tokenListIndexWalk - 1, tokenType.comma)
  )
    return null;

  check_symtab(tokenList, false);

  let symtabNode = tokenList[tokenListIndexWalk];

  let ast = new AstNode(tokenType.id);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, tokenListIndexWalk, tokenType.assig)) {
    symbolTable.push({ ...symtabNode, const: 0 });

    ast.left = parser_parse_exp(tokenList, false);

    if (!check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
      ast.left.left = new AstNode(tokenType.comma);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.comma);
    }
  } else if (!check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    symbolTable.push({ ...symtabNode, const: 0 });

    ast.left = new AstNode(tokenType.comma);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);
  } else {
    symbolTable.push({ ...symtabNode, const: 0 });
  }

  ast.right = parser_parse_inline_vars(tokenList);

  return ast;
};

/**
 * semantic analysis of identifiers
 * @arg {array} tokenList
 */
const parser_parse_id = (tokenList, prototypeIndex) => {
  if (check_token(tokenList, tokenListIndexWalk, tokenType.id)) {
    if (is_assingop(tokenList, tokenListIndexWalk + 1)) {
      let ast = parser_parse_exp(tokenList, false, prototypeIndex);

      ast.left = new AstNode(tokenType.semi);
      ast.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);

      return ast;
    } else if (
      check_token(tokenList, tokenListIndexWalk + 1, tokenType.increment) ||
      check_token(tokenList, tokenListIndexWalk + 1, tokenType.decrement)
    ) {
      return parser_parse_prepostfix(tokenList, false);
    } else {
      let ast = parser_parse_call(tokenList);
      list_eat(tokenList, tokenType.semi);
      return ast
    }
  }

  let ast = new AstNode(tokenList[tokenListIndexWalk]?.type);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat_type(tokenList);

  if (proceduresPrototypes.findIndex(e => e.id === tokenList[tokenListIndexWalk].id) < 0) {
    if (!prototypeIndex) {
      check_symtab(tokenList, false);
    }
  } else {
    check_symtab(tokenList, true);
  }

  let symtabNode = tokenList[tokenListIndexWalk];

  ast.left = new AstNode(tokenType.id);
  ast.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  if (check_token(tokenList, tokenListIndexWalk, tokenType.semi)) {
    symbolTable.push({ ...symtabNode, const: 0 });

    ast.left.left = new AstNode(tokenType.semi);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.comma)) {
    symbolTable.push({ ...symtabNode, const: 0 });

    ast.left.left = new AstNode(tokenType.comma);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.comma);

    ast.right = parser_parse_inline_vars(tokenList);

    ast.left.left.left = new AstNode(tokenType.semi);
    ast.left.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.semi);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.assig)) {
    symbolTable.push({ ...symtabNode, const: 0 });

    // if (check_token(tokenList, tokenListIndexWalk + 2, tokenType.rparen)) {
    //   ast.right = new AstNode(tokenType.assig);
    //   ast.left.left.token = tokenList[tokenListIndexWalk];
    //   list_eat(tokenList, tokenType.assig);

    //   ast.right = parser_parse_call(tokenList);

    //   return ast;

    // } else {
    // }

    ast.right = parser_parse_exp(tokenList, false, prototypeIndex);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.comma)) {
      ast.left.left = new AstNode(tokenType.comma);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.comma);

      ast.left.right = parser_parse_inline_vars(tokenList);

      ast.left.left.left = new AstNode(tokenType.semi);
      ast.left.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);
    } else {
      ast.left.left = new AstNode(tokenType.semi);
      ast.left.left.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.semi);
    }
  } else if (!prototypeIndex) {
    /**
     * parse procedures 
     */
    const prototypeId = tokenList[tokenListIndexWalk - 1].id
    let prototype = {
      id: prototypeId,
      type: tokenList[tokenListIndexWalk - 2].type,
      args: undefined,
      return: undefined,
    }

    ast.left.left = new AstNode(tokenType.rparen);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.rparen);

    let priorWalk = tokenListIndexWalk;

    ast.left.left.right = parser_parse_args(tokenList);

    let args = [];
    while (priorWalk < tokenListIndexWalk) {
      let argProt = {
        id: tokenList[priorWalk + 1].id,
        type: tokenList[priorWalk].type,
        value: undefined,
      }
      if (tokenList[priorWalk + 2].type === tokenType.assig) {
        argProt.value = tokenList[priorWalk + 3].id;
        priorWalk += 2;
      }
      priorWalk += 2;
      if (tokenList[priorWalk].type === tokenType.comma) {
        priorWalk++;
      }
      args.push(argProt)
    }
    prototype.args = args;

    proceduresPrototypes.push(prototype)

    const prototypeIndex = proceduresPrototypes.findIndex(e => e.id === prototypeId) + 1;

    ast.left.left.left = new AstNode(tokenType.lparen);
    ast.left.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.lparen);

    ast.left.left.left.left = new AstNode(tokenType.rbrace);
    ast.left.left.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.rbrace);

    ast.right = parser_parse_block(tokenList, prototypeIndex);

    ast.left.left.left.left.left = new AstNode(tokenType.lbrace);
    ast.left.left.left.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.lbrace);
  }

  return ast;
};

/**
 * semantic analysis of variable with pre/post fix operator
 * @arg {array} tokenList
 * @arg {boolean} block
 */
const parser_parse_prepostfix = (tokenList, block) => {
  let ast;

  if (is_mathop(tokenList, tokenListIndexWalk)) {
    if (check_token(tokenList, tokenListIndexWalk, tokenType.increment)) {
      ast = new AstNode(tokenType.increment);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat_math(tokenList);
    } else {
      ast = new AstNode(tokenType.decrement);
      ast.token = tokenList[tokenListIndexWalk];
      list_eat_math(tokenList);
    }

    check_symtab(tokenList, true);

    ast.right = new AstNode(tokenType.id);
    ast.right.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);
  } else {
    check_symtab(tokenList, true);

    ast = new AstNode(tokenType.id);
    ast.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.increment)) {
      ast.right = new AstNode(tokenType.increment);
      ast.right.token = tokenList[tokenListIndexWalk];
      list_eat_math(tokenList);
    } else {
      ast.right = new AstNode(tokenType.decrement);
      ast.right.token = tokenList[tokenListIndexWalk];
      list_eat_math(tokenList);
    }
  }

  if (!block) {
    ast.left = new AstNode(tokenType.semi);
    ast.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.semi);
  }

  return ast;
};

/**
 * semantic analysis of if else statement
 * @arg {array} tokenList
 */
const parser_parse_ifelse = (tokenList) => {
  let ast = new AstNode(tokenType.if);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.if);

  ast.left = new AstNode(tokenType.rparen);
  ast.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.rparen);

  if (check_token(tokenList, tokenListIndexWalk, tokenType.const)) {
    ast.left.left = new AstNode(tokenType.const);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.const);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.true)) {
    ast.left.left = new AstNode(tokenType.true);
    ast.left.left.token = {
      id: 1,
      line: tokenList[tokenListIndexWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.true);
  } else if (check_token(tokenList, tokenListIndexWalk, tokenType.false)) {
    ast.left.left = new AstNode(tokenType.const);
    ast.left.left.token = {
      id: 0,
      line: tokenList[tokenListIndexWalk].line,
      type: tokenType.const,
    };
    list_eat(tokenList, tokenType.false);
  } else {
    check_symtab(tokenList, true);

    ast.left.left = new AstNode(tokenType.id);
    ast.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);
  }

  ast.right = parser_parse_logical_exp(tokenList);

  ast.left.left.left = new AstNode(tokenType.lparen);
  ast.left.left.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.lparen);

  ast.left.left.next = new AstNode(tokenType.rbrace);
  ast.left.left.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.rbrace);

  ast.left.left.left.right = parser_parse_block(tokenList);

  ast.left.left.next.next = new AstNode(tokenType.lbrace);
  ast.left.left.next.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.lbrace);

  if (
    tokenListIndexWalk < tokenList.length &&
    check_token(tokenList, tokenListIndexWalk, tokenType.else)
  ) {
    ast.left.left.left.left = new AstNode(tokenType.else);
    ast.left.left.left.left.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.else);

    if (check_token(tokenList, tokenListIndexWalk, tokenType.if)) {
      ast.left.left.left.next = parser_parse_ifelse(tokenList);
    } else {
      ast.left.left.left.next = new AstNode(tokenType.rbrace);
      ast.left.left.left.next.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.rbrace);

      ast.left.left.left.left.right = parser_parse_block(tokenList);

      ast.left.left.left.next.next = new AstNode(tokenType.lbrace);
      ast.left.left.left.next.next.token = tokenList[tokenListIndexWalk];
      list_eat(tokenList, tokenType.lbrace);
    }
  }

  return ast;
};

/**
 * semantic analysis of for statement
 * @arg {array} tokenList
 */
const parser_parse_for = (tokenList) => {
  let ast = new AstNode(tokenType.for);
  ast.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.for);

  ast.next = new AstNode(tokenType.rparen);
  ast.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.rparen);

  check_symtab(tokenList, true);

  ast.left = new AstNode(tokenType.id);
  ast.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  ast.right = parser_parse_exp(tokenList, false);

  ast.left.left = new AstNode(tokenType.semi);
  ast.left.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.semi);

  check_symtab(tokenList, true);

  ast.left.left.left = new AstNode(tokenType.id);
  ast.left.left.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.id);

  ast.left.left.left.left = new AstNode(tokenList[tokenListIndexWalk]?.type);
  ast.left.left.left.left.token = tokenList[tokenListIndexWalk];
  list_eat_logical(tokenList);

  ast.left.left.left.left.left = new AstNode(tokenType.const);
  ast.left.left.left.left.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.const);

  ast.left.left.left.left.left.left = new AstNode(tokenType.semi);
  ast.left.left.left.left.left.left.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.semi);

  if (
    check_token(tokenList, tokenListIndexWalk, tokenType.increment) ||
    check_token(tokenList, tokenListIndexWalk, tokenType.decrement) ||
    check_token(tokenList, tokenListIndexWalk + 1, tokenType.decrement) ||
    check_token(tokenList, tokenListIndexWalk + 1, tokenType.increment)
  ) {
    ast.left.left.left.left.left.left.left = parser_parse_prepostfix(
      tokenList,
      true
    );
  } else {
    check_symtab(tokenList, true);

    ast.left.left.left.left.left.left.next = new AstNode(tokenType.id);
    ast.left.left.left.left.left.left.next.token = tokenList[tokenListIndexWalk];
    list_eat(tokenList, tokenType.id);

    ast.left.left.left.left.left.left.left = parser_parse_exp(
      tokenList,
      true
    );
  }

  ast.left.left.left.left.left.left.left.next = new AstNode(tokenType.lparen);
  ast.left.left.left.left.left.left.left.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.lparen);

  ast.left.left.left.left.left.left.next = new AstNode(tokenType.rbrace);
  ast.left.left.left.left.left.left.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.rbrace);

  ast.left.left.left.left.left.left.right = parser_parse_block(tokenList);

  ast.left.left.left.left.left.left.next.next = new AstNode(tokenType.lbrace);
  ast.left.left.left.left.left.left.next.next.token = tokenList[tokenListIndexWalk];
  list_eat(tokenList, tokenType.lbrace);

  return ast;
};

/**
 * @arg {array} tokenList
 */
const parser_parse = (tokenList) => {
  if (!tokenList[tokenListIndexWalk]) return null;

  let expList = new Ast();

  ttype = tokenList[tokenListIndexWalk].type;

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
      expList.ast = parser_parse_id(tokenList);
      break;
    case tokenType.increment:
    case tokenType.decrement:
      expList.ast = parser_parse_prepostfix(tokenList, false);
      break;
    case tokenType.str:
      expList.ast = parser_parse_str(tokenList);
      break;
    case tokenType.for:
      expList.ast = parser_parse_for(tokenList);
      break;
    case tokenType.if:
      expList.ast = parser_parse_ifelse(tokenList);
      break;
    default:
      parser_error(tokenList[tokenListIndexWalk]);
  }

  expList.next = parser_parse(tokenList);

  return expList;
};

/**
 * Semantic analysis
 * @arg {array} tokenList
 */
const parser = (tokenList) => {
  tokenListIndexWalk = 0;
  symbolTable = [];
  proceduresPrototypes = []

  return parser_parse(tokenList);
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
          value /= parseInt(ast.right.token.id);
        } else {
          value /= parseInt(symbolTable[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.mul:
        if (ast.right.token.type === tokenType.const) {
          value *= parseInt(ast.right.token.id);
        } else {
          value *= parseInt(symbolTable[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.add:
        if (ast.right.token.type === tokenType.const) {
          value += parseInt(ast.right.token.id);
        } else {
          value += parseInt(symbolTable[get_symtab(ast.right.token)].const);
        }
        break;
      case tokenType.sub:
        if (ast.right.token.type === tokenType.const) {
          value -= parseInt(ast.right.token.id);
        } else {
          value -= parseInt(symbolTable[get_symtab(ast.right.token)].const);
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
    value.number = parseInt(symbolTable[get_symtab(first)].const);
  } else {
    value.number = parseInt(first.id);
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
          walk.token.type === tokenType.bigequal ||
          walk.token.type === tokenType.lessequal ||
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
        mathFirst = parseInt(symbolTable[get_symtab(walk.right.token)].const);
      } else {
        mathFirst = parseInt(walk.right.token.id);
      }
      tokenValue = output_out_math_exp(mathFirst, walk.right.right);
    } else if (walk.right.token.type === tokenType.id) {
      tokenValue = parseInt(symbolTable[get_symtab(walk.right.token)].const);
    } else if (walk.right.token.type === tokenType.const) {
      tokenValue = parseInt(walk.right.token.id);
    } else if (walk.right.token.type === tokenType.not) {
      if (walk.right.right.token.type === tokenType.id) {
        tokenValue = parseInt(
          symbolTable[get_symtab(walk.right.right.token)].const
        );
      } else if (walk.right.right.token.type === tokenType.const) {
        tokenValue = parseInt(walk.right.right.token.id);
      }
    }

    switch (walk.type) {
      case tokenType.less:
        value.boolean = value.number < tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case tokenType.lessequal:
        value.boolean = value.number <= tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case tokenType.big:
        value.boolean = value.number > tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case tokenType.bigequal:
        value.boolean = value.number >= tokenValue ? true : false;
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
const output_out_exp = (ast, expList, left, prototypeIndex, procedureReturn) => {
  if (ast?.left?.left?.token.id === "(") return;
  let symTabI = -1;
  let prototypeArgIndex = 0;
  let procedureToken;

  if (check_ast_type(ast.token.type, "data_type")) {
    procedureToken = ast.left.token
    if (prototypeIndex + 1 && proceduresPrototypes[prototypeIndex]?.args?.find(e => e.id === procedureToken.id)) {
      prototypeArgIndex = proceduresPrototypes[prototypeIndex]?.args.findIndex(e => e.id === procedureToken.id)
    } else {
      symTabI = get_symtab(ast.left.token);
    }
  } else {
    procedureToken = ast.token
    if (prototypeIndex + 1 && proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === procedureToken.id)) {
      prototypeArgIndex = proceduresPrototypes[prototypeIndex]?.args.findIndex(e => e.id === procedureToken.id)
    } else {
      if (ast.token.type === tokenType.id) {
        symTabI = get_symtab(ast.token);
      }
    }
  }

  let value;
  let procedureArg;
  if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === procedureToken.id))) {
    value = parseInt(procedureArg.value);
  } else {
    if (symTabI > -1) {
      value = parseInt(symbolTable[symTabI].value);
    } else {
      value = parseInt(procedureToken.id)
    }
  }

  let walk;
  if (left) {
    walk = ast.left;
  } else if (procedureReturn) {
    walk = ast.right
  } else {
    walk = ast;
  }

  while (walk) {
    switch (walk.type) {
      case tokenType.div:
      case tokenType.assingdiv:
        if (walk.right.token.type === tokenType.const) {
          value /= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))) {
            value /= parseInt(procedureArg.value);
          } else if ((procedureArg = proceduresPrototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value /= procedureArg.return;
          } else {
            value /= parseInt(symbolTable[get_symtab(walk.right.token)].const);
          }
        }
        if (!procedureReturn) {
          symTabI >= 0 ? symbolTable[symTabI].const = value : proceduresPrototypes[prototypeIndex].args[prototypeArgIndex].value = value;
        }
        break;
      case tokenType.mul:
      case tokenType.assingmul:
        if (walk.right.token.type === tokenType.const) {
          value *= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))) {
            value += parseInt(procedureArg.value);
          } else if ((procedureArg = proceduresPrototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value += procedureArg.return;
          } else {
            value += parseInt(symbolTable[get_symtab(walk.right.token)].const);
          }
        }
        if (!procedureReturn) {
          symTabI >= 0 ? symbolTable[symTabI].const = value : proceduresPrototypes[prototypeIndex].args[prototypeArgIndex].value = value;
        }
        break;
      case tokenType.assig:
        if (walk.right.token.type === tokenType.const) {
          value = parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))) {
            value = parseInt(procedureArg.value);
          } else if ((procedureArg = proceduresPrototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value = procedureArg.return;
          } else {
            value = parseInt(symbolTable[get_symtab(walk.right.token)].const);
          }
        }
        if (!procedureReturn) {
          symTabI >= 0 ? symbolTable[symTabI].const = value : proceduresPrototypes[prototypeIndex].args[prototypeArgIndex].value = value;
        }
        break;
      case tokenType.assingsum:
      case tokenType.add:
        if (walk.right.token.type === tokenType.const) {
          value += parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))) {
            value += parseInt(procedureArg.value);
          } else if ((procedureArg = proceduresPrototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value += procedureArg.return;
          } else {
            value += parseInt(symbolTable[get_symtab(walk.right.token)].const);
          }
        }
        if (!procedureReturn) {
          symTabI >= 0 ? symbolTable[symTabI].const = value : proceduresPrototypes[prototypeIndex].args[prototypeArgIndex].value = value;
        }
        break;
      case tokenType.assingsub:
      case tokenType.sub:
        if (walk.right.token.type === tokenType.const) {
          value -= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))) {
            value -= parseInt(procedureArg.value);
          } else if ((procedureArg = proceduresPrototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value -= procedureArg.return;
          } else {
            value -= parseInt(symbolTable[get_symtab(walk.right.token)].const);
          }
        }
        if (!procedureReturn) {
          symTabI >= 0 ? symbolTable[symTabI].const = value : proceduresPrototypes[prototypeIndex].args[prototypeArgIndex].value = value;
        }
        break
      case tokenType.semi:
        return walk;
    }
    walk = walk.right;
  }

  if (check_ast_type(ast?.left?.right?.token.type, "id")) {
    output_out_exp(ast.left.right, expList, true, prototypeIndex, procedureReturn);
  } else if (check_ast_type(ast?.right?.token.type, "id")) {
    output_out_exp(ast.right, expList, true, prototypeIndex, procedureReturn);
  }

  if (procedureReturn) {
    proceduresPrototypes[prototypeIndex].return = value;
  }

  return walk;
};

/**
 * code generation check procedure ast
 * @arg {object} ast
 * @arg {object} id
 */
const output_out_get_ast_check = (ast, id) => {
  if (ast.left.token.id === id.id) return true;
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
const output_out_block = (walk, expList, prototypeIndex) => {
  if (!walk) return;

  switch (walk.type) {
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
      if (walk.left) { // fix two entries in exp
        output_out_exp(walk, expList, false, prototypeIndex);
      }
      break;
    case tokenType.if:
      output_out_ifelse(walk, expList, prototypeIndex);
      break;
    case tokenType.for:
      output_out_for(walk, expList, prototypeIndex);
      break;
    case tokenType.str:
      printf(walk, prototypeIndex);
      break;
    case tokenType.call:
      output_out_procedures(walk, expList)
      //output_out_call(output_out_get_ast(expList, walk.token), expList);
      break;
    case tokenType.return:
      output_out_return(walk, expList, prototypeIndex);
      return;
    default:
      break;
  }

  output_out_block(walk.right, expList, prototypeIndex);
  output_out_block(walk.next, expList, prototypeIndex);
};

/**
 * code generation of if statement
 * @arg {object} ast
 */
const output_out_ifelse = (ast, expList, prototypeIndex) => {
  const logical = output_out_logical_exp(ast, false);

  let elseBlock;
  if (ast.left?.left?.left?.left) {
    elseBlock = ast.left.left.left.left.right;
  }

  if (logical) {
    output_out_block(ast.left.left.left.right, expList, prototypeIndex);
  } else if (elseBlock) {
    output_out_block(elseBlock, expList, prototypeIndex);
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
const output_out_for = (ast, expList, prototypeIndex) => {
  const symTabI = get_symtab(ast.left.token);
  const val = parseInt(ast.right.right.token.id);
  const cond = ast.left.left.left.left.token;
  const condVal = parseInt(ast.left.left.left.left.left.token.id);
  let iterate = ast.left.left.left.left.left.left.left;

  if (iterate.type === tokenType.id) {
    iterate = ast.left.left.left.left.left.left.left.right;
  }

  let iterateValue;
  if (check_ast_type(iterate.type, "assignment_operator")) {
    iterateValue = parseInt(iterate.right.token.id);
  } else {
    iterateValue = 1;
  }

  switch (cond.type) {
    case tokenType.less:
      for (let i = val; i < condVal; i += iterateValue) {
        output_out_block(ast.left.left.left.left.left.left.right, expList, prototypeIndex);
        symbolTable[symTabI].const =
          parseInt(symbolTable[symTabI].const) + iterateValue;
      }
      break;
    case tokenType.big:
      for (let i = val; i > condVal; i += iterateValue) {
        output_out_block(ast.left.left.left.left.left.left.right, expList, prototypeIndex);
        symbolTable[symTabI].const =
          parseInt(symbolTable[symTabI].const) + iterateValue;
      }
      break;
  }
};

/**
 * code generation of procedures
 * @arg {object} expListAux
 * @arg {array} expList
 */
const output_out_procedures = (ast, expList) => {
  const procedureAst = output_out_get_ast(expList, ast.token)
  const prototypeIndex = get_prototype(procedureAst?.left?.token)
  let aux = ast.right;
  let i = 0;

  while (proceduresPrototypes[prototypeIndex].args[i] && aux) {
    if (aux.token.type === tokenType.id) {
      proceduresPrototypes[prototypeIndex].args[i].value = symbolTable[get_symtab(aux.token)].const
    } else if (aux.token.type === tokenType.const) {
      proceduresPrototypes[prototypeIndex].args[i].value = aux.token.id
    }
    i++;
    aux = aux.right;
  }

  output_out_block(procedureAst.right, expList, prototypeIndex)
  //output_out_call(procedureAst, expList, procedure.args);
};

/**
 * code generation of return procedures
 * @arg {object} expListAux
 * @arg {number} prototypeIndex
 */
const output_out_return = (ast, expList, prototypeIndex) => {
  output_out_exp(ast.right, expList, false, prototypeIndex, true);
  return;
};

/**
 * output generation
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
        output_out_exp(expListAux.ast, expList);
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
        output_out_procedures(expListAux.ast, expList)
        break;
      default:
        break;
    }

    expListAux = expListAux.next;
  } while (expListAux);

  return stdout;
};

/**
 * STDIO
 */

/**
 * printf function
 * @arg {object} ast
 */
const printf = (ast, prototypeIndex) => {
  let str = ast.token.id;
  if (ast.token.id.includes("%")) {
    let procedureArg;
    if (prototypeIndex + 1 && (procedureArg = proceduresPrototypes[prototypeIndex]?.args.find(e => e.id === ast.left.right.token.id))) {
      str = str.replace("%d", procedureArg.value);
    } else {
      if (ast.left.right.token.type === tokenType.const) {
        str = str.replace("%d", ast.left.right.token.id);
      } else {
        str = str.replace("%d", symbolTable[get_symtab(ast.left.right.token)].const);
      }
    }
  }

  stdout += str.replace(/\\n|\\t/g, (e) => {
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
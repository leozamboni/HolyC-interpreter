/**
 * @Copyright Leonardo Z. Nunes 2022
 * @license MIT
 * @fileoverview JS HolyC Interpreter
 * @version 0.0.0
 */
/**
 * Run interpreter in web front-end
 * @requires
 * @description 
 * Make sure you have a input tag with "stdin" id in your HTML DOM;
 * You need to import this procedure in your BOM:
 * 
 *  <script type="module">
 *    import { holyc_web_run } from "./holyc-interpreter.js"
 *    window.holyc_web_run = holyc_web_run;
 *  </script>  
 * 
 * You can call this procedure for run the stdin with a button, for example:
 * 
 *  <button onclick="holyc_web_run()">RUN(▶)</button>
 * 
 * After run the stdout will appear in the alert box in your site, 
 * so make sure you have it enabled in your browser;
 * For local run you need a HTTP server:
 *  
 *  bun dev
 * 
 */
let hc = {
  modes: {
    HolyNode: false
  },
  files: {
    stdin: '',
    stdout: '',
    stderr: '',
  },
  lexer: {
    char: '',
    line: 1,
    index: 0,
  },
  parser: {
    index: 0,
  },
  symtab: {
    idle: false,
    global: [],
    scoped: [],
    prototypes: [],
    class: [],
    types: [],
  },
}

const stderr = eval('(value) =>' + (hc.modes.HolyNode ? undefined : '(document.getElementById("stdout/stderr").value = value) && (document.getElementById("stdout/stderr").style.color = "red")'))
const stdin = () => eval(hc.modes.HolyNode ? undefined : 'document.getElementById("stdin")');
const stdout = (value) => (document.getElementById("stdout/stderr").value = value)
  && (document.getElementById("stdout/stderr").style.color = "black");

export const holyc_web_run = async () => stdout(await output(parser(await lexer(init_hc()))));

export const holy_node_idle = async (stdin) =>
  (hc.symtab.idle = hc.modes.HolyNode = true) && await output(parser(await lexer(init_hc(stdin))));

export const holy_node_script = async (stdin) =>
  (hc.modes.HolyNode = true) && await output(parser(await lexer(init_hc(stdin))));

export const holy_script = async (stdin) => document.getElementById("stdout/stderr").innerText = await output(parser(await lexer(init_hc(stdin))));

/**
 * AST Node
 * @constructor
 * @param {{
 *  token: AstNode, 
 *  next: AstNode, 
 *  left: AstNode, 
 *  right: AstNode,
 *  type: token_type, 
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

class Token {
  constructor(id, type, line) {
    this.id = id;
    this.type = type;
    this.line = line;
  }
}

const token_type = {
  number: 1,
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
  bool: 47,
  class: 48,
  dot: 49,
  classExp: 50,
  define: 51,
  include: 52,
  js: 53,
  jscode: 54,
};

const token_cases = [
  {
    char: '/', render: (hc) => {
      if (hc.files.stdin[hc.lexer.index] === '/') {
        while (hc.files.stdin[hc.lexer.index++]
          && hc.files.stdin[hc.lexer.index] !== '\n') { };
        return "{comment}";
      } else if (hc.files.stdin[hc.lexer.index] === '=') {
        hc.lexer.index++
        return new Token('/=', token_type.assingdiv, hc.lexer.line)
      } else {
        return new Token('/', token_type.div, hc.lexer.line)
      }
    }
  },
  {
    char: "'", render: (hc) => lex_simple_quote_string(hc)
  },
  {
    char: '"', render: (hc) => lex_string(hc)
  },
  {
    char: "+", render: (hc) => hc.files.stdin[hc.lexer.index] === "+"
      && hc.lexer.index++
      && (new Token('++', token_type.increment, hc.lexer.line))
      || hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('+=', token_type.assingsum, hc.lexer.line))
      || (new Token('+', token_type.add, hc.lexer.line))
  },
  {
    char: "-", render: (hc) => hc.files.stdin[hc.lexer.index] === "-"
      && hc.lexer.index++
      && (new Token('--', token_type.increment, hc.lexer.decrement))
      || hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('-=', token_type.assingsub, hc.lexer.line))
      || (new Token('-', token_type.sub, hc.lexer.line))
  },
  {
    char: "*", render: (hc) => hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('*=', token_type.assingmul, hc.lexer.line))
      || (new Token('*', token_type.mul, hc.lexer.line))
  },
  {
    char: ";", render: (hc) => new Token(';', token_type.semi, hc.lexer.line)
  },
  {
    char: ".", render: (hc) => new Token('.', token_type.dot, hc.lexer.line)
  },
  {
    char: "{", render: (hc) => new Token('{', token_type.rbrace, hc.lexer.line)
  },
  {
    char: "}", render: (hc) => new Token('}', token_type.lbrace, hc.lexer.line)
  },
  {
    char: "(", render: (hc) => new Token('(', token_type.rparen, hc.lexer.line)
  },
  {
    char: ")", render: (hc) => new Token(')', token_type.lparen, hc.lexer.line)
  },
  {
    char: ",", render: (hc) => new Token(',', token_type.comma, hc.lexer.line)
  },
  {
    char: "!", render: (hc) => new Token('!', token_type.not, hc.lexer.line)
  },
  {
    char: "=", render: (hc) => hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('==', token_type.equal, hc.lexer.line))
      || (new Token('=', token_type.assig, hc.lexer.line))
  },
  {
    char: "<", render: (hc) => hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('<=', token_type.lessequal, hc.lexer.line))
      || (new Token('<', token_type.less, hc.lexer.line))
  },
  {
    char: ">", render: (hc) => hc.files.stdin[hc.lexer.index] === "="
      && hc.lexer.index++
      && (new Token('>=', token_type.bigequal, hc.lexer.line))
      || (new Token('>', token_type.big, hc.lexer.line))
  },
  {
    char: "&", render: (hc) => hc.files.stdin[hc.lexer.index] === "&"
      && hc.lexer.index++
      && (new Token('&&', token_type.and, hc.lexer.line))
  },
  {
    char: "|", render: (hc) => hc.files.stdin[hc.lexer.index] === "|"
      && hc.lexer.index++
      && (new Token('||', token_type.or, hc.lexer.line))
  },
]

const token_keywords = [
  { id: "for", type: token_type.for },
  { id: "class", type: token_type.class },
  { id: "if", type: token_type.if },
  { id: "else", type: token_type.else },
  { id: "return", type: token_type.return },
  { id: "TRUE", type: token_type.true },
  { id: "FALSE", type: token_type.false },
  { id: "Bool", type: token_type.bool },
  { id: "I0", type: token_type.i0 },
  { id: "U0", type: token_type.u0 },
  { id: "I8", type: token_type.i8 },
  { id: "U8", type: token_type.u8 },
  { id: "I16", type: token_type.i16 },
  { id: "U16", type: token_type.u16 },
  { id: "I32", type: token_type.i32 },
  { id: "U32", type: token_type.u32 },
  { id: "I64", type: token_type.i64 },
  { id: "U64", type: token_type.u64 },
  { id: "F64", type: token_type.f64 },
  { id: "#define", type: token_type.define },
  { id: "#include", type: token_type.include },
  { id: "js", type: token_type.js },
]

const is_alpha = (char) => {
  return /^[A-Z0-9_#]$/i.test(char);
};

const is_number = (char) => {
  return /^[0-9]$/.test(char);
};

const is_ignored = (char) => {
  char === '\n' && hc.lexer.line++;
  return /[ \n\t]/.test(char);
}

const lex_include = async (hc) => {
  const token = lex_alpha(hc)
  if (token.id !== '#include') return token

  hc.lexer.index += 2
  hc.files.stdin = await fetch(lex_string(hc).id)
    .then(response => response.text())
    .then(text => text) + hc.files.stdin.slice(hc.lexer.index, hc.files.stdin.length);
  hc.lexer.index = 0;

  return "{include}"
}

const lex_alpha = (hc) => {
  let id = '';
  do {
    id += hc.lexer.char
  }
  while (is_alpha(hc.lexer.char = hc.files.stdin[hc.lexer.index++]));
  hc.lexer.index--;
  return new Token(id, token_keywords.find(e => e.id === id)?.type || token_type.id, hc.lexer.line);
}

const lex_number = (hc) => {
  let id = '';
  do {
    id += hc.lexer.char
  }
  while (is_number(hc.lexer.char = hc.files.stdin[hc.lexer.index++]));
  hc.lexer.index--;
  return new Token(id, token_type.number, hc.lexer.line);
}

const lex_simple_quote_string = (hc) => {
  hc.lexer.char = hc.files.stdin[hc.lexer.index++]
  let id = '';
  do {
    !hc.lexer.char && lexer_error({ id: "EOF", line: hc.lexer.line })
    id += hc.lexer.char
  }
  while ((hc.lexer.char = hc.files.stdin[hc.lexer.index++]) !== "'");
  return new Token(id, token_type.str, hc.lexer.line);
}

const lex_string = (hc) => {
  hc.lexer.char = hc.files.stdin[hc.lexer.index++]
  let id = '';
  do {
    !hc.lexer.char && lexer_error({ id: "EOF", line: hc.lexer.line })
    id += hc.lexer.char
  }
  while ((hc.lexer.char = hc.files.stdin[hc.lexer.index++]) !== '"');
  return new Token(id, token_type.str, hc.lexer.line);
}

const lexer_lex = async (hc) => {
  while ((hc.lexer.char = hc.files.stdin[hc.lexer.index++])
    && hc.lexer.char) {
    let token = ''
    if (is_ignored(hc.lexer.char)) continue;
    if (hc.lexer.char === '#') {
      token = await lex_include(hc);
      if (token === '{include}') continue
      else return token
    }
    if (is_number(hc.lexer.char)) return lex_number(hc);
    if (is_alpha(hc.lexer.char)) return lex_alpha(hc);
    token = token_cases.find(e => e.char === hc.lexer.char)?.render(hc)
    if (token === "{comment}") continue;
    else if (token) return token;
    else lexer_error({ id: hc.lexer.char, line: hc.lexer.line })
  }
}

const init_hc = (inpStdin) => {
  stderr && stderr('')
  stdin()?.value && (hc.files.stdin = stdin().value) || (hc.files.stdin = inpStdin)

  hc.files.stdout = '';
  hc.files.stderr = '';
  hc.lexer.char = '';
  hc.lexer.index = 0;
  hc.lexer.line = 1;
  hc.parser.index = 0;
  !hc.symtab.idle && (hc.symtab.types = []);
  !hc.symtab.idle && (hc.symtab.global = []);
  !hc.symtab.idle && (hc.symtab.prototypes = []);
  !hc.symtab.idle && (hc.symtab.class = []);
  !hc.symtab.idle && (hc.symtab.scoped = []);

  if (!hc.files.stdin) {
    hc.files.stderr += "Compile failure\nLexer: nothing to compile\n";
    try {
      throw stderr(hc.files.stderr);
    } catch {
      throw new Error(hc.files.stderr);
    }
  }

  return hc;
}

// TODO: create a one step lexer
const lexer = async (hc) => {
  let token_list = [];

  while (1) {
    const token = await lexer_lex(hc)
    if (!token) break;
    token_list.push(token)

    if (token.type === token_type.js && hc.files.stdin[hc.lexer.index + 1] === '{') {
      hc.lexer.index++
      token_list.push(new Token('{', token_type.rbrace, hc.lexer.line))
      hc.lexer.index++

      hc.lexer.char = hc.files.stdin[hc.lexer.index]
      let id = '';
      do {
        hc.lexer.char = hc.files.stdin[hc.lexer.index++]
        !hc.lexer.char && lexer_error({ id: "EOF", line: hc.lexer.line })
        id += hc.lexer.char
      }
      while (hc?.files?.stdin.substring(hc.lexer.index, hc.lexer.index + 2) !== '};');

      token_list.push(new Token(id, token_type.jscode, hc.lexer.line))
      token_list.push(new Token('}', token_type.lbrace, hc.lexer.line))
      token_list.push(new Token(';', token_type.semi, hc.lexer.line))

      hc.lexer.index += 2
    }
  }

  return token_list;
}

/**
 * get index of a symbol in symbol table
 */
const get_symtab = (token) => {
  for (let i = 0; i < hc.symtab.global.length; ++i) {
    if (hc.symtab.global[i].id === token.id) return i;
  }
};

/**
 * get index of prototype
 */
const get_prototype = (token) => {
  for (let i = 0; i < hc.symtab.prototypes.length; ++i) {
    if (hc.symtab.prototypes[i].id === token.id) return i;
  }
};

/**
 * get index of class
 */
const get_class = (token) => {
  for (let i = 0; i < hc.symtab.class.length; ++i) {
    if (hc.symtab.class[i].id === token.id) return i;
  }
  return -1;
};

/**
 * throw lexer error
 * @arg {object} token
 */
const lexer_error = (token) => {
  hc.files.stderr = `Compile failure\nLexer: '${token.id}' unexpected token in line ${token.line}\n`;
  try {
    throw stderr(hc.files.stderr)
  } catch {
    throw new Error(hc.files.stderr)
  }
};

/**
 * throw parser error
 * @arg {object} token
 */
const internal_error = (err) => {
  hc.files.stderr = `Compile failure\nInternal error: '${err}'`;
  try {
    throw stderr(hc.files.stderr)
  } catch {
    throw new Error(hc.files.stderr)
  }
};

/**
 * throw parser error
 * @arg {object} token
 */
const parser_error = (token) => {
  hc.files.stderr = `Compile failure\nParser: '${token.id}' unexpected token in line ${token.line}\n`;
  try {
    throw stderr(hc.files.stderr)
  } catch {
    throw new Error(hc.files.stderr)
  }
};

/**
 * check if symbol is in symbol table or not
 * @arg {array} tokenList
 * @arg {boolean} isin
 */
const check_symtab = (tokenList, isin) => {
  if (symtab_contain(tokenList[hc.parser.index]) !== isin) {
    parser_error(tokenList[hc.parser.index]);
  }
};

/**
 * throw parser error
 * @arg {array} tokenList
 * @arg {number} expectedType
 */
const list_eat = (tokenList, expectedType) => {
  try {
    if (tokenList[hc.parser.index].type !== expectedType) {
      throw new Error();
    }
    hc.parser.index++;
  } catch {
    parser_error(tokenList[hc.parser.index] ? tokenList[hc.parser.index] : tokenList[hc.parser.index - 1]);
  }
};

/**
 * check if token is in symbol table
 * @arg {object} token
 */
const symtab_contain = (token) => {
  if (hc.symtab.global.filter((e) => e.id === token.id).length) {
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
      return type === token_type.id ? true : false;
    case "data_type":
      return type === token_type.i0 ||
        type === token_type.u0 ||
        type === token_type.i8 ||
        type === token_type.u8 ||
        type === token_type.i16 ||
        type === token_type.u16 ||
        type === token_type.i32 ||
        type === token_type.u32 ||
        type === token_type.i64 ||
        type === token_type.u64 ||
        type === token_type.f64 ||
        type === token_type.bool
        ? true
        : false;
    case "assignment_operator":
      return type === token_type.assingdiv ||
        type === token_type.assingmul ||
        type === token_type.assingsub ||
        type === token_type.assingsum
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
    return type === token_type.i0 ||
      type === token_type.u0 ||
      type === token_type.i8 ||
      type === token_type.u8 ||
      type === token_type.i16 ||
      type === token_type.u16 ||
      type === token_type.i32 ||
      type === token_type.u32 ||
      type === token_type.i64 ||
      type === token_type.u64 ||
      type === token_type.f64 ||
      type === token_type.bool ||
      hc.symtab.types.findIndex(e => e.id === tokenList[index].id) > -1
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
    return type === token_type.big ||
      type === token_type.less ||
      type === token_type.or ||
      type === token_type.and ||
      type === token_type.not ||
      type === token_type.equal ||
      type === token_type.bigequal ||
      type === token_type.lessequal
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
    return type === token_type.add ||
      type === token_type.sub ||
      type === token_type.div ||
      type === token_type.mul ||
      type === token_type.increment ||
      type === token_type.decrement
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
    return type === token_type.assingdiv ||
      type === token_type.assingmul ||
      type === token_type.assingsub ||
      type === token_type.assingsum ||
      type === token_type.assig
      ? true
      : false;
  } catch {
    parser_error(tokenList[index - 1]);
  }
};

/**
 * increment hc.parser.index to next node in token list if token type is data type
 * @arg {array} tokenList
 */
const list_eat_type = (tokenList) => {
  is_dtype(tokenList, hc.parser.index) ? hc.parser.index++ : parser_error(tokenList[hc.parser.index]);
};

/**
 * increment hc.parser.index to next node in token list if token type is logical operator
 * @arg {array} tokenList
 */
const list_eat_logical = (tokenList) => {
  is_logicalop(tokenList, hc.parser.index) ? hc.parser.index++ : parser_error(tokenList[hc.parser.index]);
};

/**
 * increment hc.parser.index to next node in token list if token type is mathematical operator
 * @arg {array} tokenList
 */
const list_eat_math = (tokenList) => {
  is_mathop(tokenList, hc.parser.index) ? hc.parser.index++ : parser_error(tokenList[hc.parser.index]);
};

/**
 * increment hc.parser.index to next node in token list if token type is compound assignment operator
 * @arg {array} tokenList
 */
const list_eat_compassing = (tokenList) => {
  is_assingop(tokenList, hc.parser.index) ? hc.parser.index++ : parser_error(tokenList[hc.parser.index]);
};

const parser_parse_class = (tokenList) => {
  let ast = new AstNode(token_type.class);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.class);

  check_symtab(tokenList, false);

  if (get_class(tokenList[hc.parser.index]) > -1) {
    lexer_error(tokenList[hc.parser.index])
  } else {
    hc.symtab.class.push(tokenList[hc.parser.index]);
  }
  const classId = get_class(tokenList[hc.parser.index]);
  hc.symtab.class[classId].content = [];

  ast.left = new AstNode(token_type.id);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  list_eat(tokenList, token_type.rbrace);
  let varsIndex = hc.parser.index;

  ast.right = parser_parse_class_vars(tokenList, classId + 1);

  list_eat(tokenList, token_type.lbrace);

  if (check_token(tokenList, hc.parser.index, token_type.semi)) {
    list_eat(tokenList, token_type.semi);
  } else {
    let classValue = [];
    while (tokenList[varsIndex++]
      && tokenList[varsIndex].type !== token_type.lbrace) {
      if (check_token(tokenList, varsIndex, token_type.id)) {
        classValue.push({ ...tokenList[varsIndex], value: 0 });
      }
    }
    hc.symtab.types.findIndex(e => e.id === tokenList[hc.parser.index].id) > -1
      && lexer_error(tokenList[hc.parser.index])
    hc.symtab.types.push({
      ...tokenList[hc.parser.index],
      value: classValue,
      classType: true
    });

    ast.left.left = new AstNode(token_type.id);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);

    list_eat(tokenList, token_type.semi);
  }

  return ast;
}

/**
 * semantic analysis of logical expresions
 * @arg {array} tokenList
 */
const parser_parse_logical_exp = (tokenList) => {
  if (
    check_token(tokenList, hc.parser.index, token_type.semi) ||
    check_token(tokenList, hc.parser.index, token_type.comma) ||
    check_token(tokenList, hc.parser.index, token_type.lparen)
  )
    return null;

  let ast;

  if (
    check_token(tokenList, hc.parser.index - 1, token_type.id) ||
    check_token(tokenList, hc.parser.index - 1, token_type.number) ||
    check_token(tokenList, hc.parser.index - 1, token_type.true) ||
    check_token(tokenList, hc.parser.index - 1, token_type.false)
  ) {
    if (is_logicalop(tokenList, hc.parser.index)) {
      ast = new AstNode(tokenList[hc.parser.index]?.type);
      ast.token = tokenList[hc.parser.index];
      list_eat_logical(tokenList);
    } else {
      if (
        check_token(tokenList, hc.parser.index - 1, token_type.id) ||
        check_token(tokenList, hc.parser.index - 1, token_type.number) ||
        check_token(tokenList, hc.parser.index - 1, token_type.true) ||
        check_token(tokenList, hc.parser.index - 1, token_type.false)
      ) {
        ast = new AstNode(tokenList[hc.parser.index]?.type);
        ast.token = tokenList[hc.parser.index];
        list_eat_math(tokenList);
      }
    }
  } else if (is_logicalop(tokenList, hc.parser.index - 1)) {
    if (check_token(tokenList, hc.parser.index, token_type.not)) {
      ast = new AstNode(token_type.not);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.not);
    } else if (check_token(tokenList, hc.parser.index, token_type.id)) {
      check_symtab(tokenList, true);

      ast = new AstNode(token_type.id);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.id);
    } else if (check_token(tokenList, hc.parser.index, token_type.true)) {
      ast = new AstNode(token_type.true);
      ast.token = {
        id: 1,
        line: tokenList[hc.parser.index].line,
        type: token_type.number,
      };
      list_eat(tokenList, token_type.true);
    } else if (check_token(tokenList, hc.parser.index, token_type.false)) {
      ast = new AstNode(token_type.number);
      ast.token = {
        id: 0,
        line: tokenList[hc.parser.index].line,
        type: token_type.number,
      };
      list_eat(tokenList, token_type.false);
    } else {
      ast = new AstNode(token_type.number);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.number);
    }
  } else if (check_token(tokenList, hc.parser.index, token_type.id)) {
    check_symtab(tokenList, true);

    ast = new AstNode(token_type.id);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);
  } else if (check_token(tokenList, hc.parser.index, token_type.true)) {
    ast = new AstNode(token_type.true);
    ast.token = {
      id: 1,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.true);
  } else if (check_token(tokenList, hc.parser.index, token_type.false)) {
    ast = new AstNode(token_type.number);
    ast.token = {
      id: 0,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.false);
  } else {
    ast = new AstNode(token_type.number);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.number);
  }

  ast.right = parser_parse_logical_exp(tokenList);

  return ast;
};

/**
 * semantic analysis of expresions
 * @arg {array} tokenList
 */
const parser_parse_exp = (tokenList, arg, prototypeIndex, inClass) => {
  if (
    check_token(tokenList, hc.parser.index, token_type.semi) ||
    check_token(tokenList, hc.parser.index, token_type.comma) ||
    (arg && check_token(tokenList, hc.parser.index, token_type.lparen))
  )
    return null;

  let ast;

  if (hc.symtab.prototypes.find(e => e.id === tokenList[hc.parser.index].id)
    && !check_token(tokenList, hc.parser.index - 1, token_type.number)
    && !check_token(tokenList, hc.parser.index - 1, token_type.id)) {
    return parser_parse_call(tokenList)
  } else if (
    check_token(tokenList, hc.parser.index - 1, token_type.id) ||
    check_token(tokenList, hc.parser.index - 1, token_type.number) ||
    check_token(tokenList, hc.parser.index - 1, token_type.classExp)
  ) {
    if (is_mathop(tokenList, hc.parser.index)) {
      if (
        check_token(tokenList, hc.parser.index + 1, token_type.id) ||
        check_token(tokenList, hc.parser.index + 1, token_type.number)
      ) {
        ast = new AstNode(tokenList[hc.parser.index]?.type);
        ast.token = tokenList[hc.parser.index];
        list_eat_math(tokenList);
      }
    } else if (is_assingop(tokenList, hc.parser.index)) {
      ast = new AstNode(tokenList[hc.parser.index]?.type);
      ast.token = tokenList[hc.parser.index];
      list_eat_compassing(tokenList);
    } else {
      ast = new AstNode(token_type.assig);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.assig);
    }
  } else if (
    check_token(tokenList, hc.parser.index - 1, token_type.assig) ||
    is_assingop(tokenList, hc.parser.index - 1)
  ) {
    if (check_token(tokenList, hc.parser.index, token_type.id)) {
      let procedureArg;
      if (prototypeIndex) {
        procedureArg = hc.symtab.prototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[hc.parser.index].id)
        if (!procedureArg) {
          procedureArg = hc.symtab.scoped[prototypeIndex - 1]?.find(e => e.id === tokenList[hc.parser.index].id)
        }
      } else {
        procedureArg = hc.symtab.prototypes.find(e => e.id === tokenList[hc.parser.index].id)
      }

      !procedureArg && check_symtab(tokenList, true);

      if (check_token(tokenList, hc.parser.index + 1, token_type.dot)) {
        let ids = [];

        while (tokenList[hc.parser.index].type
          === token_type.id) {
          tokenList[hc.parser.index].type === token_type.id
            && ids.push(tokenList[hc.parser.index].id)
          hc.parser.index += 2;
        }
        hc.parser.index -= 2;
        tokenList[hc.parser.index].id = ids.join('.')
        tokenList[hc.parser.index].type = token_type.classExp

        ast = new AstNode(token_type.classExp);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.classExp);
      } else {
        ast = new AstNode(token_type.id);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.id);
      }
    } else {
      if (!prototypeIndex) {
        const index = get_symtab(tokenList[hc.parser.index - 2])
        if (index != undefined) {
          hc.symtab.global[index] = {
            id: tokenList[hc.parser.index - 2].id,
            line: tokenList[hc.parser.index - 2].line,
            value: tokenList[hc.parser.index].id,
          };
        }
      }

      if (check_token(tokenList, hc.parser.index, token_type.true)) {
        hc.symtab.global[get_symtab(tokenList[hc.parser.index - 2])].value = 1;
        tokenList[hc.parser.index].type = token_type.number
        tokenList[hc.parser.index].id = 1;

        ast = new AstNode(token_type.number);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.number);
      } else if (check_token(tokenList, hc.parser.index, token_type.false)) {
        hc.symtab.global[get_symtab(tokenList[hc.parser.index - 2])].value = 0;
        tokenList[hc.parser.index].type = token_type.number
        tokenList[hc.parser.index].id = 0;

        ast = new AstNode(token_type.number);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.number);
      } else {
        ast = new AstNode(token_type.number);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.number);
      }
    }
  } else if (is_mathop(tokenList, hc.parser.index - 1)
    || check_token(tokenList, hc.parser.index - 1, token_type.return)) {
    if (check_token(tokenList, hc.parser.index, token_type.id)) {
      let procedureArg;
      if (prototypeIndex) {
        procedureArg = hc.symtab.prototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[hc.parser.index].id)
        if (!procedureArg) {
          procedureArg = hc.symtab.scoped[prototypeIndex - 1]?.find(e => e.id === tokenList[hc.parser.index].id)
        }
      } else {
        procedureArg = hc.symtab.prototypes.find(e => e.id === tokenList[hc.parser.index].id)
      }
      !procedureArg && check_symtab(tokenList, true);

      ast = new AstNode(token_type.id);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.id);
    } else {
      ast = new AstNode(token_type.number);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.number);
    }
  } else if (check_token(tokenList, hc.parser.index, token_type.id)) {
    let procedureArg;
    if (prototypeIndex) {
      procedureArg = hc.symtab.prototypes[prototypeIndex - 1].args.find(e => e.id === tokenList[hc.parser.index].id)
      if (!procedureArg) {
        procedureArg = hc.symtab.scoped[prototypeIndex - 1]?.find(e => e.id === tokenList[hc.parser.index].id)
      }
    } else {
      procedureArg = hc.symtab.prototypes.find(e => e.id === tokenList[hc.parser.index].id)
    }
    !procedureArg && check_symtab(tokenList, true);

    ast = new AstNode(token_type.id);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);
  } else if (!check_token(tokenList, hc.parser.index, token_type.semi)) {
    ast = new AstNode(token_type.comma);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);
  } else {
    parser_error(tokenList[hc.parser.index]);
  }

  ast.right = parser_parse_exp(tokenList, arg, prototypeIndex);

  return ast;
};

/**
 * semantic analysis of string arguments
 * @arg {array} tokenList
 */
const parser_parse_str_args = (tokenList) => {
  if (check_token(tokenList, hc.parser.index, token_type.semi)) return null;

  let ast;

  if (
    check_token(tokenList, hc.parser.index, token_type.id) ||
    check_token(tokenList, hc.parser.index, token_type.number)
  ) {
    if (check_token(tokenList, hc.parser.index + 1, token_type.dot)) {
      let ids = [];

      while (tokenList[hc.parser.index].type
        !== token_type.semi) {
        tokenList[hc.parser.index].type === token_type.id
          && ids.push(tokenList[hc.parser.index].id)
        hc.parser.index++;
      }

      hc.parser.index--;
      tokenList[hc.parser.index].id = ids.join('.')
      tokenList[hc.parser.index].type = token_type.classExp

      ast = new AstNode(token_type.classExp);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.classExp);
    } else {
      ast = new AstNode(tokenList[hc.parser.index]?.type);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, tokenList[hc.parser.index].type);
    }
  } else if (check_token(tokenList, hc.parser.index, token_type.str)) {
    ast = new AstNode(token_type.str);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.str);
  } else {
    ast = parser_parse_exp(tokenList, false);
  }

  if (check_token(tokenList, hc.parser.index, token_type.assig)) {
    ast.left = new AstNode(token_type.assig);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.assig);

    ast.left.right = parser_parse_exp(tokenList, false);
  } else if (!check_token(tokenList, hc.parser.index, token_type.semi)) {
    ast.left = new AstNode(token_type.comma);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);
  }

  ast.right = parser_parse_str_args(tokenList);

  return ast;
};

/**
 * semantic analysis of inline strings
 * @arg {array} tokenList
 */
const parser_parse_inline_str = (tokenList) => {
  if (check_token(tokenList, hc.parser.index, token_type.semi)) return null;

  let ast = new AstNode(token_type.str);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.str);

  if (!check_token(tokenList, hc.parser.index, token_type.semi)) {
    ast.next = new AstNode(token_type.comma);
    ast.next.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);

    if (!check_token(tokenList, hc.parser.index, token_type.str)) {
      parser_error(tokenList[hc.parser.index]);
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
  let ast = new AstNode(token_type.return);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.return);

  ast.right = parser_parse_exp(tokenList, false, prototypeIndex)

  ast.left = new AstNode(token_type.semi);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  return ast;
};

/**
 * semantic analysis of strings
 * @arg {array} tokenList
 */
const parser_parse_str = (tokenList) => {
  let ast = new AstNode(token_type.str);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.str);

  if (check_token(tokenList, hc.parser.index, token_type.semi)) {
    ast.left = new AstNode(token_type.semi);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.semi);
  } else {
    ast.left = new AstNode(token_type.comma);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);

    if (check_token(tokenList, hc.parser.index, token_type.str)) {
      ast.right = parser_parse_inline_str(tokenList);

      ast.left.left = new AstNode(token_type.semi);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);
    } else {
      ast.left.right = parser_parse_str_args(tokenList);

      ast.left.left = new AstNode(token_type.semi);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);
    }
  }

  return ast;
};

/**
 * semantic analysis of procedures arguments
 * @arg {array} tokenList
 */
const parser_parse_args = (tokenList = []) => {
  if (check_token(tokenList, hc.parser.index, token_type.lparen)) return null;

  let ast = new AstNode(tokenList[hc.parser.index]?.type);
  ast.token = tokenList[hc.parser.index];
  list_eat_type(tokenList);

  ast.next = new AstNode(token_type.id);
  ast.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  if (check_token(tokenList, hc.parser.index, token_type.assig)) {
    ast.next.next = new AstNode(token_type.assig);
    ast.next.next.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.assig);

    if (check_token(tokenList, hc.parser.index, token_type.number)) {
      ast.next.next.next = new AstNode(token_type.number);
      ast.next.next.next.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.number);
    } else {
      ast.next.next.next = new AstNode(token_type.str);
      ast.next.next.next.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.str);
    }
  }

  if (!check_token(tokenList, hc.parser.index, token_type.lparen)) {
    ast.next.next = new AstNode(token_type.comma);
    ast.next.next.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);
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
  if (hc.symtab.prototypes[prototype].args.length === i) return null;

  let ast;

  if (hc.symtab.prototypes[prototype].args[i]?.id) {
    if (check_token(tokenList, hc.parser.index, token_type.id)) {
      check_symtab(tokenList, true);

      ast = new AstNode(token_type.id);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.id);

      if (is_mathop(tokenList, hc.parser.index)) ast

    } else if (check_token(tokenList, hc.parser.index, token_type.number)) {
      ast = new AstNode(token_type.number);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.number);
    }
  } else {
    if (check_token(tokenList, hc.parser.index, token_type.id)) {
      check_symtab(tokenList, true);

      ast = new AstNode(token_type.id);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.id);
    } else {
      ast = new AstNode(token_type.number);
      ast.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.number);
    }
  }

  if (i < hc.symtab.prototypes[prototype].args.length - 1) {
    if (ast) {
      if (check_token(tokenList, hc.parser.index, token_type.comma)) {
        ast.left = new AstNode(token_type.comma);
        ast.left.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.comma);
      } else {
        return ast;
      }
    } else {
      if (notAssigArgs || check_token(tokenList, hc.parser.index, token_type.comma)) {
        ast = new AstNode(token_type.comma);
        ast.token = tokenList[hc.parser.index];
        list_eat(tokenList, token_type.comma);
      } else if (!notAssigArgs || check_token(tokenList, hc.parser.index, token_type.rparen)) {
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
  if (hc.symtab.prototypes.findIndex(e => e.id === tokenList[hc.parser.index].id) < 0) {
    check_symtab(tokenList, true);
  }

  const prototype = get_prototype(tokenList[hc.parser.index]);

  let ast = new AstNode(token_type.call);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  if (hc.symtab.prototypes[prototype].args.length) {
    const notAssigArgs = hc.symtab.prototypes[prototype].args.filter(e => { return e.id === undefined ? true : false }).length

    if (check_token(tokenList, hc.parser.index, token_type.semi) && !notAssigArgs) {
      ast.left = new AstNode(token_type.semi);
      ast.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);

      return ast;
    }

    ast.left = new AstNode(token_type.rparen);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.rparen);

    if (check_token(tokenList, hc.parser.index, token_type.str) && !notAssigArgs && tokenList[hc.parser.index].id === "*") {
      ast.left.left = new AstNode(token_type.str);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.str);
    } else {
      if (hc.symtab.prototypes[prototype].args.length) {
        ast.right = parser_parse_call_args(tokenList, prototype, notAssigArgs, 0);
      }
    }

    ast.left.left = new AstNode(token_type.lparen);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.lparen);

  } else if (check_token(tokenList, hc.parser.index, token_type.rparen)) {
    ast.left = new AstNode(token_type.rparen);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.rparen);

    if (check_token(tokenList, hc.parser.index, token_type.str) && tokenList[hc.parser.index].id === "*") {
      ast.left.next = new AstNode(token_type.str);
      ast.left.next.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.str);
    }

    ast.left.left = new AstNode(token_type.lparen);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.lparen);
  }

  return ast;
};

/**
 * semantic analysis of inline variables declaration
 * @arg {array} tokenList
 */
const parser_parse_inline_vars = (tokenList, classId, prototypeIndex) => {
  if (
    check_token(tokenList, hc.parser.index, token_type.semi) &&
    !check_token(tokenList, hc.parser.index - 1, token_type.comma)
  )
    return null;

  check_symtab(tokenList, false);

  let symtabNode = tokenList[hc.parser.index];

  let ast = new AstNode(token_type.id);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  if (check_token(tokenList, hc.parser.index, token_type.assig)) {
    if (classId) {
      hc.symtab.class[classId - 1].content.push({ ...symtabNode, value: 0 });
    } else if (prototypeIndex) {
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }

    ast.left = parser_parse_exp(tokenList, false, prototypeIndex);

    if (!check_token(tokenList, hc.parser.index, token_type.semi)) {
      ast.left.left = new AstNode(token_type.comma);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.comma);
    }
  } else if (!check_token(tokenList, hc.parser.index, token_type.semi)) {
    if (classId) {
      hc.symtab.class[classId - 1].content.push({ ...symtabNode, value: 0 });
    } else if (prototypeIndex) {
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }

    ast.left = new AstNode(token_type.comma);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);
  } else {
    if (classId) {
      hc.symtab.class[classId - 1].content.push({ ...symtabNode, value: 0 });
    } else if (prototypeIndex) {
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }
  }

  ast.right = parser_parse_inline_vars(tokenList, classId, prototypeIndex);

  return ast;
};

const parser_parse_class_vars = (tokenList, classId) => {
  if (check_token(tokenList, hc.parser.index, token_type.lbrace))
    return null;

  let ast = new AstNode(tokenList[hc.parser.index]?.type);
  ast.token = tokenList[hc.parser.index];
  list_eat_type(tokenList);

  ast.left = parser_parse_inline_vars(tokenList, classId);

  ast.left.left = new AstNode(token_type.semi);
  ast.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  ast.right = parser_parse_class_vars(tokenList, classId);

  return ast;
}

const parser_parse_class_var_exp = (tokenList) => {
  let ast = new AstNode(token_type.id);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  if (check_token(tokenList, hc.parser.index, token_type.assig)) return ast;

  ast.right = new AstNode(token_type.dot);
  ast.right.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.dot);

  ast.right.right = parser_parse_class_var_exp(tokenList);
  return ast;
}

const parser_parse_class_assig = (tokenList, index) => {
  let vars = hc.parser.index;
  let ids = [];
  while (tokenList[vars].type
    !== token_type.assig
    && tokenList[++vars]) {
    tokenList[vars].type === token_type.id
      && ids.push(tokenList[vars].id)
  }

  let isGlobal = false;
  if (index
    && hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === tokenList[hc.parser.index].id) < 0) {
    parser_error(tokenList[hc.parser.index])
  } else {
    check_symtab(tokenList, true);
    index = hc.symtab.global.findIndex(e => e.id === tokenList[hc.parser.index].id);
    isGlobal = true;
  }

  let ast = parser_parse_class_var_exp(tokenList);

  ast.left = new AstNode(token_type.assig);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.assig);

  if (isGlobal) {
    ast.left.left = parser_parse_exp(tokenList, false)
  } else {
    ast.left.left = parser_parse_exp(tokenList, false, index)
  }

  ast.left.left.left = new AstNode(token_type.semi);
  ast.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  return ast;
}

/**
 * semantic analysis of identifiers
 * @arg {array} tokenList
 */
const parser_parse_id = (tokenList, prototypeIndex) => {
  if (!hc.symtab.types.find(e => e.id === tokenList[hc.parser.index].id)
    && check_token(tokenList, hc.parser.index, token_type.id)) {
    if (is_assingop(tokenList, hc.parser.index + 1)) {
      let ast = parser_parse_exp(tokenList, false, prototypeIndex);

      ast.left = new AstNode(token_type.semi);
      ast.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);

      return ast;
    } else if (
      check_token(tokenList, hc.parser.index + 1, token_type.increment) ||
      check_token(tokenList, hc.parser.index + 1, token_type.decrement)
    ) {
      return parser_parse_prepostfix(tokenList, false);
    } else if (check_token(tokenList, hc.parser.index + 1, token_type.dot)) {
      return parser_parse_class_assig(tokenList, prototypeIndex);
    } else {
      let ast = parser_parse_call(tokenList);
      list_eat(tokenList, token_type.semi);
      return ast
    }
  }

  let ast = new AstNode(tokenList[hc.parser.index]?.type);
  ast.token = tokenList[hc.parser.index];
  list_eat_type(tokenList);

  if (prototypeIndex && hc.symtab.prototypes[prototypeIndex - 1]?.args?.find(e => e.id === tokenList[hc.parser.index].id)
    || prototypeIndex && hc.symtab.scoped[prototypeIndex - 1]?.find(e => e.id === tokenList[hc.parser.index].id)) {
    parser_error(tokenList[hc.parser.index]);
  } else {
    check_symtab(tokenList, false);
  }

  const symtabNode = tokenList[hc.parser.index];

  ast.left = new AstNode(token_type.id);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  if (check_token(tokenList, hc.parser.index, token_type.semi)) {
    if (prototypeIndex) {
      !hc.symtab.scoped[prototypeIndex - 1] && (hc.symtab.scoped[prototypeIndex - 1] = []);
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }

    ast.left.left = new AstNode(token_type.semi);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.semi);
  } else if (check_token(tokenList, hc.parser.index, token_type.comma)) {
    if (prototypeIndex) {
      !hc.symtab.scoped[prototypeIndex - 1] && (hc.symtab.scoped[prototypeIndex - 1] = []);
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }

    ast.left.left = new AstNode(token_type.comma);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.comma);

    ast.right = parser_parse_inline_vars(tokenList);

    ast.left.left.left = new AstNode(token_type.semi);
    ast.left.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.semi);
  } else if (check_token(tokenList, hc.parser.index, token_type.assig)) {
    if (prototypeIndex) {
      !hc.symtab.scoped[prototypeIndex - 1] && (hc.symtab.scoped[prototypeIndex - 1] = []);
      hc.symtab.scoped[prototypeIndex - 1].push({ ...symtabNode, value: 0 });
    } else {
      hc.symtab.global.push({ ...symtabNode, value: 0 });
    }

    ast.right = parser_parse_exp(tokenList, false, prototypeIndex);

    if (check_token(tokenList, hc.parser.index, token_type.comma)) {
      ast.left.left = new AstNode(token_type.comma);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.comma);

      ast.left.right = parser_parse_inline_vars(tokenList, null, prototypeIndex);

      ast.left.left.left = new AstNode(token_type.semi);
      ast.left.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);
    } else {
      ast.left.left = new AstNode(token_type.semi);
      ast.left.left.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.semi);
    }
  } else if (!prototypeIndex) {
    /**
     * parse procedures 
     */
    const prototypeId = tokenList[hc.parser.index - 1].id
    let prototype = {
      id: prototypeId,
      type: tokenList[hc.parser.index - 2].type,
      args: undefined,
      return: undefined,
    }

    ast.left.left = new AstNode(token_type.rparen);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.rparen);

    let priorWalk = hc.parser.index;

    ast.left.left.right = parser_parse_args(tokenList);

    let args = [];
    while (priorWalk < hc.parser.index) {
      let argProt = {
        id: tokenList[priorWalk + 1].id,
        type: tokenList[priorWalk].type,
        value: undefined,
      }
      if (tokenList[priorWalk + 2].type === token_type.assig) {
        argProt.value = tokenList[priorWalk + 3].id;
        priorWalk += 2;
      }
      priorWalk += 2;
      if (tokenList[priorWalk].type === token_type.comma) {
        priorWalk++;
      }
      args.push(argProt)
    }
    prototype.args = args;

    hc.symtab.prototypes.push(prototype)

    const prototypeIndex = hc.symtab.prototypes.findIndex(e => e.id === prototypeId) + 1;

    ast.left.left.left = new AstNode(token_type.lparen);
    ast.left.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.lparen);

    ast.left.left.left.left = new AstNode(token_type.rbrace);
    ast.left.left.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.rbrace);

    ast.right = parser_parse_block(tokenList, prototypeIndex);

    ast.left.left.left.left.left = new AstNode(token_type.lbrace);
    ast.left.left.left.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.lbrace);
  }

  return ast;
};

/**
 * semantic analysis of variable with pre/post fix operator
 * @arg {array} tokenList
 * @arg {boolean} block
 */
const parser_parse_prepostfix = (tokenList, block, prototypeIndex) => {
  let ast;

  if (is_mathop(tokenList, hc.parser.index)) {
    if (check_token(tokenList, hc.parser.index, token_type.increment)) {
      ast = new AstNode(token_type.increment);
      ast.token = tokenList[hc.parser.index];
      list_eat_math(tokenList);
    } else {
      ast = new AstNode(token_type.decrement);
      ast.token = tokenList[hc.parser.index];
      list_eat_math(tokenList);
    }

    if (prototypeIndex) {
      let token = hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === tokenList[hc.parser.index])
      if (token < 0) {
        token = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === tokenList[hc.parser.index])
        if (token < 0) {
          parser_error(tokenList[hc.parser.index])
        }
      }
    } else {
      check_symtab(tokenList, true);
    }

    ast.right = new AstNode(token_type.id);
    ast.right.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);
  } else {
    if (prototypeIndex) {
      let token = hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === tokenList[hc.parser.index])
      if (token < 0) {
        token = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === tokenList[hc.parser.index])
        if (token < 0) {
          parser_error(tokenList[hc.parser.index])
        }
      }
    } else {
      check_symtab(tokenList, true);
    }

    ast = new AstNode(token_type.id);
    ast.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);

    if (check_token(tokenList, hc.parser.index, token_type.increment)) {
      ast.right = new AstNode(token_type.increment);
      ast.right.token = tokenList[hc.parser.index];
      list_eat_math(tokenList);
    } else {
      ast.right = new AstNode(token_type.decrement);
      ast.right.token = tokenList[hc.parser.index];
      list_eat_math(tokenList);
    }
  }

  if (!block) {
    ast.left = new AstNode(token_type.semi);
    ast.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.semi);
  }

  return ast;
};

/**
 * semantic analysis of if else statement
 * @arg {array} tokenList
 */
const parser_parse_ifelse = (tokenList, prototypeIndex) => {
  let ast = new AstNode(token_type.if);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.if);

  ast.left = new AstNode(token_type.rparen);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.rparen);

  if (check_token(tokenList, hc.parser.index, token_type.number)) {
    ast.left.left = new AstNode(token_type.number);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.number);
  } else if (check_token(tokenList, hc.parser.index, token_type.true)) {
    ast.left.left = new AstNode(token_type.true);
    ast.left.left.token = {
      id: 1,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.true);
  } else if (check_token(tokenList, hc.parser.index, token_type.false)) {
    ast.left.left = new AstNode(token_type.number);
    ast.left.left.token = {
      id: 0,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.false);
  } else {
    if (!hc.symtab.prototypes[prototypeIndex - 1]?.args?.find(e => e.id === tokenList[hc.parser.index].id)
      && !hc.symtab.scoped[prototypeIndex - 1]?.find(e => e.id === tokenList[hc.parser.index].id)) {
      check_symtab(tokenList, true);
    }

    ast.left.left = new AstNode(token_type.id);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);
  }

  ast.right = parser_parse_logical_exp(tokenList, prototypeIndex);

  ast.left.left.left = new AstNode(token_type.lparen);
  ast.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.lparen);

  ast.left.left.next = new AstNode(token_type.rbrace);
  ast.left.left.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.rbrace);

  ast.left.left.left.right = parser_parse_block(tokenList, prototypeIndex);

  ast.left.left.next.next = new AstNode(token_type.lbrace);
  ast.left.left.next.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.lbrace);

  if (
    hc.parser.index < tokenList.length &&
    check_token(tokenList, hc.parser.index, token_type.else)
  ) {
    ast.left.left.left.left = new AstNode(token_type.else);
    ast.left.left.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.else);

    if (check_token(tokenList, hc.parser.index, token_type.if)) {
      ast.left.left.left.next = parser_parse_ifelse(tokenList);
    } else {
      ast.left.left.left.next = new AstNode(token_type.rbrace);
      ast.left.left.left.next.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.rbrace);

      ast.left.left.left.left.right = parser_parse_block(tokenList, prototypeIndex);

      ast.left.left.left.next.next = new AstNode(token_type.lbrace);
      ast.left.left.left.next.next.token = tokenList[hc.parser.index];
      list_eat(tokenList, token_type.lbrace);
    }
  }

  return ast;
};

/**
 * semantic analysis of for statement
 * @arg {array} tokenList
 */
const parser_parse_for = (tokenList, prototypeIndex) => {
  let ast = new AstNode(token_type.for);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.for);

  ast.next = new AstNode(token_type.rparen);
  ast.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.rparen);

  if (prototypeIndex) {
    let token = hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === tokenList[hc.parser.index])
    if (token < 0) {
      token = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === tokenList[hc.parser.index])
      if (token < 0) {
        parser_error(tokenList[hc.parser.index])
      }
    }
  } else {
    check_symtab(tokenList, true);
  }

  ast.left = new AstNode(token_type.id);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  ast.right = parser_parse_exp(tokenList, false, prototypeIndex);

  ast.left.left = new AstNode(token_type.semi);
  ast.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  if (prototypeIndex) {
    let token = hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === tokenList[hc.parser.index])
    if (token < 0) {
      token = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === tokenList[hc.parser.index])
      if (token < 0) {
        parser_error(tokenList[hc.parser.index])
      }
    }
  } else {
    check_symtab(tokenList, true);
  }

  ast.left.left.left = new AstNode(token_type.id);
  ast.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  ast.left.left.left.left = new AstNode(tokenList[hc.parser.index]?.type);
  ast.left.left.left.left.token = tokenList[hc.parser.index];
  list_eat_logical(tokenList);

  ast.left.left.left.left.left = new AstNode(token_type.number);
  ast.left.left.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.number);

  ast.left.left.left.left.left.left = new AstNode(token_type.semi);
  ast.left.left.left.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  if (
    check_token(tokenList, hc.parser.index, token_type.increment) ||
    check_token(tokenList, hc.parser.index, token_type.decrement) ||
    check_token(tokenList, hc.parser.index + 1, token_type.decrement) ||
    check_token(tokenList, hc.parser.index + 1, token_type.increment)
  ) {
    ast.left.left.left.left.left.left.left = parser_parse_prepostfix(
      tokenList,
      true,
      prototypeIndex
    );
  } else {
    check_symtab(tokenList, true);

    ast.left.left.left.left.left.left.next = new AstNode(token_type.id);
    ast.left.left.left.left.left.left.next.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.id);

    ast.left.left.left.left.left.left.left = parser_parse_exp(
      tokenList,
      true,
      prototypeIndex
    );
  }

  ast.left.left.left.left.left.left.left.next = new AstNode(token_type.lparen);
  ast.left.left.left.left.left.left.left.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.lparen);

  ast.left.left.left.left.left.left.next = new AstNode(token_type.rbrace);
  ast.left.left.left.left.left.left.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.rbrace);

  ast.left.left.left.left.left.left.right = parser_parse_block(tokenList, prototypeIndex);

  ast.left.left.left.left.left.left.next.next = new AstNode(token_type.lbrace);
  ast.left.left.left.left.left.left.next.next.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.lbrace);

  return ast;
};

const parser_parse_include = (tokenList) => {
  let ast = new AstNode(token_type.include);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.include);

  ast.left = new AstNode(token_type.str);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.str);

  return ast;
};

const parser_parse_js = (tokenList) => {
  let ast = new AstNode(token_type.js);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.js);

  ast.left = new AstNode(token_type.rbrace);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.rbrace);

  ast.left.left = new AstNode(token_type.jscode);
  ast.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.jscode);

  ast.left.left.left = new AstNode(token_type.lbrace);
  ast.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.lbrace);

  ast.left.left.left.left = new AstNode(token_type.semi);
  ast.left.left.left.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.semi);

  return ast;
};

const parser_parse_define = (tokenList) => {
  let ast = new AstNode(token_type.define);
  ast.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.define);

  let symtabNode = tokenList[hc.parser.index]
  check_symtab(tokenList, false);
  ast.left = new AstNode(token_type.id);
  ast.left.token = tokenList[hc.parser.index];
  list_eat(tokenList, token_type.id);

  let value;
  if (check_token(tokenList, hc.parser.index, token_type.number)) {
    value = tokenList[hc.parser.index].id
    ast.left.left = new AstNode(token_type.number);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.number);
  } else if (check_token(tokenList, hc.parser.index, token_type.true)) {
    value = tokenList[hc.parser.index].id
    ast.left.left = new AstNode(token_type.true);
    ast.left.left.token = {
      id: 1,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.true);
  } else if (check_token(tokenList, hc.parser.index, token_type.false)) {
    value = tokenList[hc.parser.index].id
    ast.left.left = new AstNode(token_type.number);
    ast.left.left.token = {
      id: 0,
      line: tokenList[hc.parser.index].line,
      type: token_type.number,
    };
    list_eat(tokenList, token_type.false);
  } else {
    value = tokenList[hc.parser.index].id
    ast.left.left = new AstNode(token_type.str);
    ast.left.left.token = tokenList[hc.parser.index];
    list_eat(tokenList, token_type.str);
  }

  hc.symtab.global.push({ ...symtabNode, value: value });

  return ast;
};

/**
 * semantic analysis of blocks
 * @arg {array} tokenList
 */
const parser_parse_block = (tokenList, prototypeIndex) => {
  if (check_token(tokenList, hc.parser.index, token_type.lbrace)) return null;

  let ast;

  switch (tokenList[hc.parser.index].type) {
    case token_type.bool:
    case token_type.i0:
    case token_type.u0:
    case token_type.i8:
    case token_type.u8:
    case token_type.i16:
    case token_type.u16:
    case token_type.i32:
    case token_type.u32:
    case token_type.i64:
    case token_type.u64:
    case token_type.f64:
    case token_type.id:
      ast = parser_parse_id(tokenList, prototypeIndex);
      break;
    case token_type.increment:
    case token_type.decrement:
      ast = parser_parse_prepostfix(tokenList, false);
      break;
    case token_type.str:
      ast = parser_parse_str(tokenList);
      break;
    case token_type.for:
      ast = parser_parse_for(tokenList, prototypeIndex);
      break;
    case token_type.if:
      ast = parser_parse_ifelse(tokenList, prototypeIndex);
      break;
    case token_type.return:
      ast = parser_parse_return(tokenList, prototypeIndex);
      break;
    case token_type.class:
      ast = parser_parse_class(tokenList);
      break;
    default:
      parser_error(tokenList[hc.parser.index]);
  }

  ast.next = parser_parse_block(tokenList, prototypeIndex);

  return ast;
};

/**
 * @arg {array} tokenList
 */
const parser_parse = (tokenList) => {
  if (!tokenList[hc.parser.index]) return null;

  let expList = new Ast();

  const type = tokenList[hc.parser.index].type;

  switch (type) {
    case token_type.bool:
    case token_type.i0:
    case token_type.u0:
    case token_type.i8:
    case token_type.u8:
    case token_type.i16:
    case token_type.u16:
    case token_type.i32:
    case token_type.u32:
    case token_type.i64:
    case token_type.u64:
    case token_type.f64:
    case token_type.id:
      expList.ast = parser_parse_id(tokenList);
      break;
    case token_type.define:
      expList.ast = parser_parse_define(tokenList);
      break;
    case token_type.js:
      expList.ast = parser_parse_js(tokenList);
      break;
    case token_type.include:
      expList.ast = parser_parse_include(tokenList);
      break;
    case token_type.increment:
    case token_type.decrement:
      expList.ast = parser_parse_prepostfix(tokenList, false);
      break;
    case token_type.str:
      expList.ast = parser_parse_str(tokenList);
      break;
    case token_type.for:
      expList.ast = parser_parse_for(tokenList);
      break;
    case token_type.if:
      expList.ast = parser_parse_ifelse(tokenList);
      break;
    case token_type.class:
      expList.ast = parser_parse_class(tokenList);
      break;
    default:
      parser_error(tokenList[hc.parser.index]);
  }

  expList.next = parser_parse(tokenList);

  return expList;
};

/**
 * Semantic analysis
 * @arg {array} tokenList
 */
const parser = (tokenList) => tokenList && parser_parse(tokenList);

/**
 * code generation of mathematical expresions
 * @arg {object} ast
 */
const output_out_math_exp = (first, ast) => {
  let value = first;
  while (ast) {
    switch (ast.type) {
      case token_type.div:
        if (ast.right.token.type === token_type.number) {
          value /= parseInt(ast.right.token.id);
        } else {
          value /= parseInt(hc.symtab.global[get_symtab(ast.right.token)].value);
        }
        break;
      case token_type.mul:
        if (ast.right.token.type === token_type.number) {
          value *= parseInt(ast.right.token.id);
        } else {
          value *= parseInt(hc.symtab.global[get_symtab(ast.right.token)].value);
        }
        break;
      case token_type.add:
        if (ast.right.token.type === token_type.number) {
          value += parseInt(ast.right.token.id);
        } else {
          value += parseInt(hc.symtab.global[get_symtab(ast.right.token)].value);
        }
        break;
      case token_type.sub:
        if (ast.right.token.type === token_type.number) {
          value -= parseInt(ast.right.token.id);
        } else {
          value -= parseInt(hc.symtab.global[get_symtab(ast.right.token)].value);
        }
        break;
    }
    if (ast?.right?.right) {
      ast = ast.right.right;
    } else {
      break;
    }
    if (
      ast.type !== token_type.add &&
      ast.type !== token_type.sub &&
      ast.type !== token_type.div &&
      ast.type !== token_type.mul
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
const output_out_logical_exp = (ast, inside, prototypeIndex) => {
  let first;
  let walk;
  let value = {
    number: 0,
    boolean: false,
  };

  if (!inside && ast.left.left.token.type === token_type.not) {
    first = ast.right.token;
    walk = ast.right.right;
  } else if (!inside) {
    first = ast.left.left.token;
    walk = ast.right;
  } else if (inside && ast.right.token.type === token_type.not) {
    first = ast.right.right.token;
    walk = ast.right.right.right;
  } else if (inside) {
    first = ast.right.token;
    walk = ast.right.right;
  }

  if (first.type === token_type.id) {
    let token = '';

    if ((token = hc.symtab.prototypes[prototypeIndex]?.args?.find(e => e.id === first.id))) {
      value.number = parseInt(token.value);
    } else if ((token = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === first.id))) {
      value.number = parseInt(token.value);
    } else {
      value.number = parseInt(hc.symtab.global[get_symtab(first)].value);
    }
  } else {
    value.number = parseInt(first.id);
  }

  if (
    walk?.token.type === token_type.add ||
    walk?.token.type === token_type.sub ||
    walk?.token.type === token_type.div ||
    walk?.token.type === token_type.mul
  ) {
    value.number = output_out_math_exp(value.number, walk);
    while (walk) {
      walk = walk.right;
      if (walk) {
        if (
          walk.token.type === token_type.or ||
          walk.token.type === token_type.and ||
          walk.token.type === token_type.big ||
          walk.token.type === token_type.less ||
          walk.token.type === token_type.bigequal ||
          walk.token.type === token_type.lessequal ||
          walk.token.type === token_type.equal
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
      walk.right?.right?.token.type === token_type.add ||
      walk.right?.right?.token.type === token_type.sub ||
      walk.right?.right?.token.type === token_type.div ||
      walk.right?.right?.token.type === token_type.mul ||
      walk.right?.right?.token.type === token_type.not
    ) {
      let mathFirst;
      if (walk.right.token.type === token_type.id) {
        mathFirst = parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
      } else {
        mathFirst = parseInt(walk.right.token.id);
      }
      tokenValue = output_out_math_exp(mathFirst, walk.right.right);
    } else if (walk.right.token.type === token_type.id) {
      tokenValue = parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
    } else if (walk.right.token.type === token_type.number) {
      tokenValue = parseInt(walk.right.token.id);
    } else if (walk.right.token.type === token_type.not) {
      if (walk.right.right.token.type === token_type.id) {
        tokenValue = parseInt(
          hc.symtab.global[get_symtab(walk.right.right.token)].value
        );
      } else if (walk.right.right.token.type === token_type.number) {
        tokenValue = parseInt(walk.right.right.token.id);
      }
    }

    switch (walk.type) {
      case token_type.less:
        value.boolean = value.number < tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case token_type.lessequal:
        value.boolean = value.number <= tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case token_type.big:
        value.boolean = value.number > tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case token_type.bigequal:
        value.boolean = value.number >= tokenValue ? true : false;
        value.number = tokenValue;
        break;
      case token_type.or:
        const inside = output_out_logical_exp(walk, true, prototypeIndex);
        value.boolean = value.boolean || inside ? true : false;
        while (walk) {
          walk = walk.right;
          if (walk && walk.token.type === token_type.or) break;
        }
        break;
      case token_type.and:
        value.boolean = value.boolean && (tokenValue ? true : false);
        break;
      case token_type.not:
        value.boolean = !value.boolean;
        break;
      case token_type.equal:
        value.boolean = value.number === tokenValue ? true : false;
        break;
    }
    if (!walk) break;
    walk = walk.right.right;
    if (walk && walk?.token?.type === token_type.not) {
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
  let prototypeArgIndex = -1;
  let procedureToken;

  if (check_ast_type(ast?.token.type, "data_type")) {
    procedureToken = ast.left.token
    if (prototypeIndex + 1 && hc.symtab.prototypes[prototypeIndex]?.args?.find(e => e.id === procedureToken.id)
      || hc.symtab.scoped[prototypeIndex]?.find(e => e.id === procedureToken.id)) {
      prototypeArgIndex = hc.symtab.prototypes[prototypeIndex]?.args.findIndex(e => e.id === procedureToken.id)
      if (prototypeArgIndex < 0) {
        prototypeArgIndex = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === procedureToken.id)
      }
    } else {
      symTabI = get_symtab(ast.left.token);
    }
  } else if (ast?.token) {
    procedureToken = ast.token
    if (prototypeIndex + 1 && hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === procedureToken.id)
      || hc.symtab.scoped[prototypeIndex]?.find(e => e.id === procedureToken.id)) {
      prototypeArgIndex = hc.symtab.prototypes[prototypeIndex]?.args.findIndex(e => e.id === procedureToken.id)
      if (prototypeArgIndex < 0) {
        prototypeArgIndex = hc.symtab.scoped[prototypeIndex].findIndex(e => e.id === procedureToken.id)
      }
    } else {
      if (ast.token.type === token_type.id) {
        symTabI = get_symtab(ast.token);
      }
    }
  } else {
    return;
  }

  let value;
  let procedureArg;
  if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === procedureToken.id))) {
    value = parseInt(procedureArg.value);
  } else {
    if (symTabI > -1) {
      value = parseInt(hc.symtab.global[symTabI].value);
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

  let classItems = [];
  let lastWalk = null;
  let first = walk;

  while (walk) {
    switch (walk.type) {
      case token_type.dot:
        !lastWalk.left && classItems.push(lastWalk.token)
        if (!walk.right?.right) {
          classItems.push(walk.right.token)

          value = 0;
          while (first) {
            switch (first.type) {
              case token_type.assig:
                if (first.left.token.type === token_type.number) {
                  value = parseInt(first.left.token.id);
                }
                break
              case token_type.div:
                if (first.left.token.type === token_type.number) {
                  value /= parseInt(first.left.token.id);
                }
                break;
            }
            first = first.left;
          }


          if (!procedureReturn) {
            if (symTabI >= 0) {
              if (!Array.isArray(hc.symtab.global[symTabI].value)) {
                hc.symtab.global[symTabI].value = []
              }
              hc.symtab.global[symTabI].value.push({
                id: classItems.map(e => e.id).join('.'),
                value: value
              })
            } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
              if (!Array.isArray(hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value)) {
                hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = []
              }
              hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value.push({
                id: classItems.map(e => e.id).join('.'),
                value: value
              })
            } else {
              if (!Array.isArray(hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value)) {
                hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = []
              }
              hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value.push({
                id: classItems.map(e => e.id).join('.'),
                value: value
              })
            }
          }
        }
        break
      case token_type.div:
      case token_type.assingdiv:
        if (walk.right.token.type === token_type.number) {
          value /= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))
            || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === walk.right.token.id))) {
            if (walk.right.token.type === token_type.classExp) {
              value /= procedureArg.value.find(e => e.id === classExpIds.join('.'))?.value
            } else {
              value /= parseInt(procedureArg.value);
            }
          } else if ((procedureArg = hc.symtab.prototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value /= procedureArg.return;
          } else {
            value /= parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
          }
        }
        if (!procedureReturn) {
          if (symTabI >= 0) {
            hc.symtab.global[symTabI].value = value
          } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
            hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = value
          } else {
            hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = value
          }
        }
        break;
      case token_type.mul:
      case token_type.assingmul:
        if (walk.right.token.type === token_type.number) {
          value *= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))
            || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === walk.right.token.id))) {
            if (walk.right.token.type === token_type.classExp) {
              value *= procedureArg.value.find(e => e.id === classExpIds.join('.'))?.value
            } else {
              value *= parseInt(procedureArg.value);
            }
          } else if ((procedureArg = hc.symtab.prototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value *= procedureArg.return;
          } else {
            value *= parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
          }
        }
        if (!procedureReturn) {
          if (symTabI >= 0) {
            hc.symtab.global[symTabI].value = value
          } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
            hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = value
          } else {
            hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = value
          }
        }
        break;
      case token_type.assig:
        let classExpIds = ''
        if (walk.right.token.type === token_type.classExp) {
          classExpIds = walk.right.token.id.split('.')
          walk.right.token.id = classExpIds[0]
          classExpIds.shift()
        }
        if (walk.right.token.type === token_type.number) {
          value = parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1
            && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))
            || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === walk.right.token.id))) {

            if (walk.right.token.type === token_type.classExp) {
              value = procedureArg.value.find(e => e.id === classExpIds.join('.'))?.value
            } else {
              value = parseInt(procedureArg.value);
            }

          } else if ((procedureArg = hc.symtab.prototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value = procedureArg.return;
          } else {
            if (walk.right.token.type === token_type.classExp) {
              value = parseInt(hc.symtab.global[get_symtab(walk.right.token)].value.find(e => e.id === classExpIds.join('.'))?.value)
            } else {
              value = parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
            }
          }
        }

        if (!procedureReturn) {
          if (symTabI >= 0) {
            hc.symtab.global[symTabI].value = value
          } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
            hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = value
          } else {
            hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = value
          }
        }
        break;
      case token_type.assingsum:
      case token_type.add:
        if (walk.right.token.type === token_type.number) {
          value += parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))
            || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === walk.right.token.id))) {
            if (walk.right.token.type === token_type.classExp) {
              value += procedureArg.value.find(e => e.id === classExpIds.join('.'))?.value
            } else {
              value += parseInt(procedureArg.value);
            }
          } else if ((procedureArg = hc.symtab.prototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value += procedureArg.return;
          } else {
            value += parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
          }
        }
        if (!procedureReturn) {
          if (symTabI >= 0) {
            hc.symtab.global[symTabI].value = value
          } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
            hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = value
          } else {
            hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = value
          }
        }
        break;
      case token_type.assingsub:
      case token_type.sub:
        if (walk.right.token.type === token_type.number) {
          value -= parseInt(walk.right.token.id);
        } else {
          let procedureArg;
          if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === walk.right.token.id))
            || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === walk.right.token.id))) {
            if (walk.right.token.type === token_type.classExp) {
              value -= procedureArg.value.find(e => e.id === classExpIds.join('.'))?.value
            } else {
              value -= parseInt(procedureArg.value);
            }
          } else if ((procedureArg = hc.symtab.prototypes.find(e => e.id === walk.right.token.id))) {
            output_out_procedures(walk.right, expList)
            value -= procedureArg.return;
          } else {
            value -= parseInt(hc.symtab.global[get_symtab(walk.right.token)].value);
          }
        }
        if (!procedureReturn) {
          if (symTabI >= 0) {
            hc.symtab.global[symTabI].value = value
          } else if (hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex]?.id === procedureToken.id) {
            hc.symtab.prototypes[prototypeIndex].args[prototypeArgIndex].value = value
          } else {
            hc.symtab.scoped[prototypeIndex][prototypeArgIndex].value = value
          }
        }
        break
      case token_type.semi:
        return walk;
    }
    lastWalk = walk
    walk = walk.right;
  }

  if (check_ast_type(ast?.left?.right?.token.type, "id")) {
    output_out_exp(ast.left.right, expList, true, prototypeIndex, procedureReturn);
  } else if (check_ast_type(ast?.right?.token.type, "id")) {
    output_out_exp(ast.right, expList, true, prototypeIndex, procedureReturn);
  }

  if (procedureReturn) {
    hc.symtab.prototypes[prototypeIndex].return = value;
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
    case token_type.bool:
    case token_type.i0:
    case token_type.u0:
    case token_type.i8:
    case token_type.u8:
    case token_type.i16:
    case token_type.u16:
    case token_type.i32:
    case token_type.u32:
    case token_type.i64:
    case token_type.u64:
    case token_type.f64:
    case token_type.id:
      if (walk.left) { // fix two entries in exp
        output_out_exp(walk, expList, false, prototypeIndex);
      }
      break;
    case token_type.if:
      const ifElseVal = output_out_ifelse(walk, expList, prototypeIndex);
      if (ifElseVal === "{RETURN}") return ifElseVal;
      break;
    case token_type.for:
      const forVal = output_out_for(walk, expList, prototypeIndex);
      if (forVal === "{RETURN}") return forVal;
      break;
    case token_type.str:
      printf(walk, prototypeIndex);
      break;
    case token_type.call:
      output_out_procedures(walk, expList)
      break;
    case token_type.return:
      output_out_return(walk, expList, prototypeIndex);
      return "{RETURN}";
    default:
      break;
  }

  output_out_block(walk.right, expList, prototypeIndex);
  return output_out_block(walk.next, expList, prototypeIndex);
};

/**
 * code generation of if statement
 * @arg {object} ast
 */
const output_out_ifelse = (ast, expList, prototypeIndex) => {
  const logical = output_out_logical_exp(ast, false, prototypeIndex);

  let elseBlock;
  if (ast.left?.left?.left?.left) {
    elseBlock = ast.left.left.left.left.right;
  }

  let outBlockVal = '';
  if (logical) {
    outBlockVal = output_out_block(ast.left.left.left.right, expList, prototypeIndex);
  } else if (elseBlock) {
    outBlockVal = output_out_block(elseBlock, expList, prototypeIndex);
  }

  if (!logical && ast?.left?.left?.left?.next?.token.type === token_type.if) {
    output_out_ifelse(ast.left.left.left.next, expList);
  }

  return outBlockVal;
};

const output_out_js = (ast) => {
  eval(ast.left.left.token.id)
}

/**
 * code generation of for statement
 * @arg {object} ast
 * @arg {array} expList
 */
const output_out_for = (ast, expList, prototypeIndex) => {
  let symTabI = get_symtab(ast.left.token);
  if (!symTabI) {
    symTabI = hc.symtab.prototypes[prototypeIndex]?.args?.findIndex(e => e.id === ast.left.token.id)
    if (symTabI < 0) {
      symTabI = hc.symtab.scoped[prototypeIndex]?.findIndex(e => e.id === ast.left.token.id)
    }
  }
  const val = parseInt(ast.right.right.token.id);
  const cond = ast.left.left.left.left.token;
  const condVal = parseInt(ast.left.left.left.left.left.token.id);
  let iterate = ast.left.left.left.left.left.left.left;

  if (iterate.type === token_type.id) {
    iterate = ast.left.left.left.left.left.left.left.right;
  }

  let iterateValue;
  if (check_ast_type(iterate.type, "assignment_operator")) {
    iterateValue = parseInt(iterate.right.token.id);
  } else {
    iterateValue = 1;
  }

  let blockVal = '';
  switch (cond.type) {
    case token_type.less:
      for (let i = val; i < condVal; i += iterateValue) {
        blockVal = output_out_block(ast.left.left.left.left.left.left.right, expList, prototypeIndex);
        if (blockVal === "{RETURN}") return blockVal;
        if (hc.symtab.global[symTabI]?.id === ast.left.token.id) {
          hc.symtab.global[symTabI].value =
            parseInt(hc.symtab.global[symTabI].value) + iterateValue;
        } else if (hc.symtab.prototypes[prototypeIndex]?.args[symTabI]?.id === ast.left.token.id) {
          hc.symtab.prototypes[prototypeIndex].args[symTabI].value =
            parseInt(hc.symtab.prototypes[prototypeIndex].args[symTabI].value) + iterateValue;
        } else {
          hc.symtab.scoped[prototypeIndex][symTabI].value =
            parseInt(hc.symtab.scoped[prototypeIndex][symTabI].value) + iterateValue;
        }
      }
      break;
    case token_type.big:
      for (let i = val; i > condVal; i += iterateValue) {
        blockVal = output_out_block(ast.left.left.left.left.left.left.right, expList, prototypeIndex);
        if (blockVal === "{RETURN}") return blockVal;
        if (hc.symtab.global[symTabI]?.id === ast.left.token.id) {
          hc.symtab.global[symTabI].value =
            parseInt(hc.symtab.global[symTabI].value) + iterateValue;
        } else if (hc.symtab.prototypes[prototypeIndex]?.args[symTabI]?.id === ast.left.token.id) {
          hc.symtab.prototypes[prototypeIndex].args[symTabI].value =
            parseInt(hc.symtab.prototypes[prototypeIndex].args[symTabI].value) + iterateValue;
        } else {
          hc.symtab.scoped[prototypeIndex][symTabI].value =
            parseInt(hc.symtab.scoped[prototypeIndex][symTabI].value) + iterateValue;
        }
      }
      break;
  }

  return blockVal;
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

  while (hc.symtab.prototypes[prototypeIndex].args[i] && aux) {
    if (aux.token.type === token_type.id) {
      hc.symtab.prototypes[prototypeIndex].args[i].value = hc.symtab.global[get_symtab(aux.token)].value
    } else if (aux.token.type === token_type.number) {
      hc.symtab.prototypes[prototypeIndex].args[i].value = aux.token.id
    }
    i++;
    aux = aux.right;
  }

  output_out_block(procedureAst.right, expList, prototypeIndex)
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
const output = async (expList) => {
  if (!expList) return hc.files.stdout;

  let expListAux = expList;

  do {
    switch (expListAux.ast.type) {
      case token_type.bool:
      case token_type.i0:
      case token_type.u0:
      case token_type.i8:
      case token_type.u8:
      case token_type.i16:
      case token_type.u16:
      case token_type.i32:
      case token_type.u32:
      case token_type.i64:
      case token_type.u64:
      case token_type.f64:
      case token_type.id:
        output_out_exp(expListAux.ast, expList);
        break;
      case token_type.if:
        output_out_ifelse(expListAux.ast, expList);
        break;
      case token_type.for:
        output_out_for(expListAux.ast, expList);
        break;
      case token_type.js:
        output_out_js(expListAux.ast);
        break;
      case token_type.str:
        let walk = expListAux.ast;
        do {
          printf(walk);
          walk = walk.right;
        } while (walk);
        break;
      case token_type.call:
        output_out_procedures(expListAux.ast, expList)
        break;
      default:
        break;
    }

    expListAux = expListAux.next;
  } while (expListAux);

  return hc.files.stdout;
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
    if (prototypeIndex + 1 && (procedureArg = hc.symtab.prototypes[prototypeIndex]?.args.find(e => e.id === ast.left.right.token.id))
      || (procedureArg = hc.symtab.scoped[prototypeIndex]?.find(e => e.id === ast.left.right.token.id))) {
      str = str.replace(/%d/g, procedureArg.value);
    } else {
      if (ast.left.right.token.type === token_type.number) {
        str = str.replace(/%d/g, ast.left.right.token.id);
      } else {
        if (ast.left.right.token.type === token_type.classExp) {
          let classexp = ast.left.right.token.id.split('.')
          let args = ast.left.right.token;

          args.id = classexp.shift()
          str = str.replace(/%d/g, hc.symtab.global[get_symtab(args)].value.find(e => e.id === classexp.join('.'))?.value);
        } else {
          str = str.replace(/%d/g, hc.symtab.global[get_symtab(ast.left.right.token)].value);
        }
      }
    }
  }
  str = str.replace(/undefined/g, 'NULL');
  str = str.replace(/null/g, 'NULL');
  hc.files.stdout += str.replace(/\\n|\\t/g, (e) => {
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

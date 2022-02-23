class Ast {
	constructor(token, left, right, next) {
    this.token = token;
    this.next = next;
		this.left = left;
		this.right = right;
	}
}

var tokenType = {
  const: 1,
  id: 2,
  add: 3,
  sub: 4,
  div: 5,
  mul: 6,
};

var is_alpha = (val) => {
  if (val === " ") return false;
  return /^[A-Z]$/i.test(val);
};

var is_digit = (val) => {
  if (val === " ") return false;
  return !isNaN(val);
};

function holyc_lex(input) {
  var tokenList = [];
  var line = 1;

  for (let i = 0; i < input.length; ++i) {
    if (input[i] === " ") continue;

    if (input[i] === '"') {
      let aux = "";
      i++;
      while (input[i] !== '"') {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.const,
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

      while (is_alpha(input[i])) {
        aux += input[i++];
      }

      tokenList.push({
        value: aux,
        line: line,
        type: tokenType.id,
      });
    }

    switch (input[i]) {
      case "\n":
        line++;
        break;
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
    }
  }
  return tokenList;
}

function holyc_parser(tokenList=[]) {
  
  console.log(tokenList.length);
  console.log(tokenList.value);
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
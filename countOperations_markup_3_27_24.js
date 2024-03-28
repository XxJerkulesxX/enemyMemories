let regex = /(?<![a-zA-Z])([a-zA-Z])(?![a-zA-Z])/g;

let replaceFunc = (match, p1, offset, string) => {
  // Ignore π and ε
  if (p1 === "π" || p1.toLowerCase() === "π" || p1 === "ε" || p1.toLowerCase() === "ε") return p1;
  console.log('hewwo');
  // Calculate index from letter
  let index = p1.toLowerCase().charCodeAt(0) - "a".charCodeAt(0);

console.log(index);

};

let countOperations = (expression) => {
  let operationCount = 0;
  let stack = [];
  console.log('hewwo');
  for (let i = 0; i < expression.length; i++) {
    let char = expression[i];
    console.log('inside for loop');
    if (char === '(') {
      stack.push(char);
    } else if (char === ')') {
      stack.pop();
    } else if (char === '+' || char === '-' || char === '*' || char === '/' || char === '^') {
      let prevChar = expression[i - 1];
      let nextChar = expression[i + 1];

      if (prevChar && nextChar && /[a-zA-Z0-9πε]/.test(prevChar) && /[a-zA-Z0-9πε]/.test(nextChar)) {
        if (stack.length === 0 || stack[stack.length - 1] === '(') {
          operationCount++;
        }
      }
    }
  }

  return operationCount;
};

//let result = '(a + b* π) * (c + d* ε)'.replace(regex, replaceFunc);
let operationCount = countOperations('(a + b* π) * (c + d* ε)');

console.log('Modified expression:', result);
console.log('Number of operations:', operationCount);
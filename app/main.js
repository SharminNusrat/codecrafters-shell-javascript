const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const os = require('os');

const pathDirs = process.env.PATH.split(path.delimiter);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const supportedTypes = ['type', 'echo', 'pwd', 'cd', 'exit'];

const parseInput = (answer) => {
  let currentArg = "";
  let args = [];
  let inSingleQuotes = false;
  let inDoubleQuotes = false;
  let escaped = false;
  let hasUnmatchedQuote = false;

  const singleQuote = "'";
  const doubleQuote = '"';

  for (let i = 0; i < answer.length; i++) {
    const char = answer[i];

    if (!inSingleQuotes && !inDoubleQuotes) {
      if (char === singleQuote) {
        inSingleQuotes = true;
      }
      else if (char === doubleQuote) {
        if (hasUnmatchedQuote || currentArg.length) {
          throw new Error("Unmatched double quote");
        }
        inDoubleQuotes = true;
        hasUnmatchedQuote = true;
      }
      else if (char === " ") {
        if(escaped) {
          currentArg += char;
        }
        else if(currentArg.length) {
          args.push(currentArg);
          currentArg = "";
        }
      }
      else if(char === "\\") {
        escaped = true;
      }
      else currentArg += char;
    }
    else if (inSingleQuotes) {
      if (char === singleQuote) {
        inSingleQuotes = false;
      }
      else {
        currentArg += char
      }
    }
    else if (inDoubleQuotes) {
      if (escaped) {
        if (char === '$' || char === '\\' || char === '"') {
          currentArg += char;
        } else {
          currentArg += '\\' + char;
        }
        escaped = false;
      }
      else {
        if (char === '\\') {
          escaped = true;
        }
        else if (char === doubleQuote) {
          if (i + 1 < answer.length && answer[i + 1] === doubleQuote) {
            i++;
          }
          else {
            inDoubleQuotes = false;
            hasUnmatchedQuote = false;
            if (currentArg.length) {
              args.push(currentArg);
              currentArg = "";
            }
          }
        }
        else {
          currentArg += char;
        }
      }
    }
  }

  if (currentArg.length > 0) {
    args.push(currentArg);
  }

  if (inSingleQuotes) {
    throw new Error("Unmatched single quote.");
  }
  if (inDoubleQuotes || hasUnmatchedQuote) {
    throw new Error("Unmatched double quote.");
  }

  return args;
}

const handleEcho = (args) => {
  let result = args.join(" ");
  console.log(result);
}

const handleType = (answer) => {
  let command = answer.slice(5);

  // console.log(process.env.PATH);
  if (supportedTypes.indexOf(command) > -1) {
    console.log(`${command} is a shell builtin`);
    return;
  }

  for (const dir of pathDirs) {
    const filePath = path.join(dir, command);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      try {
        fs.accessSync(filePath, fs.constants.X_OK);
        console.log(`${command} is ${filePath}`);
        return;
      } catch {
        continue;
      }
    }
  }
  console.log(`${command}: not found`);
}

const handlePwd = (answer) => {
  if (answer === 'pwd') {
    console.log(process.cwd());
  }
  else {
    console.log(`${answer}: command not found`);
  }
}

const handleCd = (answer) => {
  let dir = answer.slice(3);
  if (dir === '~') {
    dir = os.homedir();
  }

  try {
    process.chdir(dir);
  } catch (err) {
    console.log(`cd: ${dir}: No such file or directory`);
  }
}

const runProgram = (answer, args) => {
  const program = args.shift();
  let found = false;

  for (const dir of pathDirs) {
    // const filePath = path.join(dir, program);
    const filePath = program;

    try {
      const stdout = execFileSync(filePath, args, {
        stdio: 'pipe',
        encoding: 'utf8',
      });

      process.stdout.write(stdout);
      found = true;
      return;
    } catch {
      continue;
    }
  }

  if (!found) console.log(`${answer}: command not found`);
}

const main = () => {
  rl.question('$ ', (answer) => {
    if (answer === 'exit 0') {
      rl.close();
      return;
    }
    let args = [];
    args = parseInput(answer);
    // console.log(args);

    if (answer.startsWith('echo ')) {
      args.shift();
      handleEcho(args);
    }
    else if (answer.startsWith('type ')) {
      handleType(answer);
    }
    else if (answer.startsWith('pwd')) {
      handlePwd(answer);
    }
    else if (answer.startsWith('cd ')) {
      handleCd(answer);
    }
    else {
      runProgram(answer, args);
    }
    main();
  });
}

main();